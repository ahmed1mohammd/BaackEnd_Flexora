'use strict';

/**
 * ─── Flexora Subscription Reminder Cron ──────────────────────────────────────
 *
 * يعمل كل يوم الساعة 9 صباحاً.
 * يبحث عن الأعضاء النشطين اللي اشتراكهم هينتهي خلال 5 أيام بالضبط.
 * يبعت لكل واحد منهم رسالة تذكير على الواتساب.
 *
 * الـ API المستخدمة:
 *   POST {WHATSAPP_SERVICE_URL}/api/whatsapp/send-reminder
 *   Headers: x-api-key
 *   Body:    { gymId, phone, playerName, daysLeft }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const cron   = require('node-cron');
const axios  = require('axios');
const prisma = require('../prisma/client');

// ── Helper: add days to date ────────────────────────────────────────────────
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ── Core reminder job ────────────────────────────────────────────────────────
async function runReminderJob() {
  const waUrl = process.env.WHATSAPP_SERVICE_URL;
  const waKey = process.env.WA_API_KEY;

  if (!waUrl) {
    console.warn('[ReminderCron] WHATSAPP_SERVICE_URL not set — skipping.');
    return;
  }

  console.log('[ReminderCron] ▶ Running subscription reminder check…');

  // Target: members whose subscription ends exactly 5 days from today
  const today     = new Date();
  const targetDay = addDays(today, 5);
  const dayStart  = new Date(targetDay); dayStart.setHours(0,  0,  0,   0);
  const dayEnd    = new Date(targetDay); dayEnd.setHours(23, 59, 59, 999);

  let members;
  try {
    members = await prisma.member.findMany({
      where: {
        status: 'active',
        subscriptionEnd: { gte: dayStart, lte: dayEnd },
        phoneNumber: { not: null },
      },
      select: {
        id:          true,
        name:        true,
        phoneNumber: true,
        gymId:       true,
        subscriptionEnd: true,
      },
    });
  } catch (err) {
    console.error('[ReminderCron] DB query failed:', err.message);
    return;
  }

  console.log(`[ReminderCron] Found ${members.length} member(s) expiring in 5 days.`);
  if (members.length === 0) return;

  let sent = 0, failed = 0;

  for (const member of members) {
    try {
      await axios.post(
        `${waUrl}/api/whatsapp/send-reminder`,
        {
          gymId:      member.gymId,
          phone:      member.phoneNumber,
          playerName: member.name,
          daysLeft:   5,
        },
        {
          headers:  { 'x-api-key': waKey || '', 'Content-Type': 'application/json' },
          timeout:  12_000,
        }
      );
      console.log(`[ReminderCron] ✅ Sent to ${member.name} (${member.phoneNumber})`);
      sent++;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      console.error(`[ReminderCron] ❌ Failed for ${member.name}: ${msg}`);
      failed++;
    }

    // 2-second gap between messages to avoid WhatsApp rate-limiting
    await new Promise(r => setTimeout(r, 2_000));
  }

  console.log(`[ReminderCron] ✔ Done — sent: ${sent}, failed: ${failed}`);
}

// ── Export: start the cron ────────────────────────────────────────────────────
function startReminderCron() {
  // Every day at 9:00 AM server time
  cron.schedule('0 9 * * *', async () => {
    try {
      await runReminderJob();
    } catch (err) {
      console.error('[ReminderCron] Unexpected error:', err.message);
    }
  });

  console.log('[ReminderCron] Scheduled — runs daily at 09:00 AM ✅');
}

// Also export runReminderJob so it can be triggered manually via an admin API if needed
module.exports = { startReminderCron, runReminderJob };
