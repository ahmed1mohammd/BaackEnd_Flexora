const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// UUID format validation helper
const isUuid = (str) => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// Helper to notify via WhatsApp microservice
// Calls POST {WHATSAPP_SERVICE_URL}/api/whatsapp/send-welcome
// with the correct payload and x-api-key header
const notifyWhatsApp = async (gymId, phoneNumber, playerName, attendanceUUID) => {
  const baseUrl = process.env.WHATSAPP_SERVICE_URL;
  const apiKey  = process.env.WA_API_KEY;

  if (!baseUrl) {
    console.warn('[WA Bridge] WHATSAPP_SERVICE_URL not set — skipping notification.');
    return;
  }

  try {
    await axios.post(
      `${baseUrl}/api/whatsapp/send-welcome`,
      { gymId, phone: phoneNumber, playerName, attendanceUUID },
      {
        headers: {
          'x-api-key': apiKey || '',
          'Content-Type': 'application/json',
        },
        timeout: 10_000, // Don't block the main flow for more than 10s
      }
    );
    console.log(`[WA Bridge] Welcome message dispatched for ${phoneNumber} (gym: ${gymId})`);
  } catch (err) {
    // Non-blocking — log but don't fail the member registration
    console.error('[WA Bridge] Notification failed:', err.response?.data?.error || err.message);
  }
};

// Helper to send a subscription reminder via WhatsApp
// Calls POST {WHATSAPP_SERVICE_URL}/api/whatsapp/send-reminder
const sendWhatsAppReminder = async (gymId, phoneNumber, playerName, daysLeft) => {
  const baseUrl = process.env.WHATSAPP_SERVICE_URL;
  const apiKey  = process.env.WA_API_KEY;

  if (!baseUrl) return;

  try {
    await axios.post(
      `${baseUrl}/api/whatsapp/send-reminder`,
      { gymId, phone: phoneNumber, playerName, daysLeft },
      {
        headers: { 'x-api-key': apiKey || '', 'Content-Type': 'application/json' },
        timeout: 10_000,
      }
    );
    console.log(`[WA Bridge] Reminder dispatched for ${phoneNumber} — ${daysLeft} days left`);
  } catch (err) {
    console.error('[WA Bridge] Reminder failed:', err.response?.data?.error || err.message);
  }
};


// ==========================================
// GET ALL MEMBERS
// ==========================================
exports.getAllMembers = catchAsync(async (req, res, next) => {
  const queryFilter = { gymId: req.user.gymId };
  
  // If user is a coach, filter to only return members assigned to this coach
  if (req.user.role === 'Coach') {
    queryFilter.coachId = req.user.id;
  }

  // If user is a Receptionist, scope to their branch
  if (req.user.role === 'Receptionist' && req.user.branchId) {
    queryFilter.branchId = req.user.branchId;
  }

  const members = await prisma.member.findMany({
    where: queryFilter,
    include: {
      coach: { select: { name: true } },
      activePackage: { select: { name: true, durationInDays: true } },
      attendances: {
        select: { checkInTime: true }
      }
    }
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const formattedMembers = members.map(m => {
    const attendedDays = m.attendances.length;
    
    // Days since member registration
    const diffTime = Math.max(0, Date.now() - new Date(m.createdAt).getTime());
    const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const absentDays = Math.max(0, daysPassed - attendedDays);
    const commitmentRate = Math.min(100, Math.round((attendedDays / Math.max(1, daysPassed)) * 100));
    
    const attendedToday = m.attendances.some(att => new Date(att.checkInTime) >= todayStart);

    return {
      ...m,
      packageName: m.activePackage?.name || 'باقة مخصصة',
      coachName: m.coach?.name || 'بدون مدرب',
      packageId: m.activePackageId || '',
      attendedDays,
      absentDays,
      commitmentRate,
      attendedToday,
      attendances: undefined // Keep payload light
    };
  });

  res.status(200).json({
    status: 'success',
    results: formattedMembers.length,
    data: { members: formattedMembers }
  });
});

// ==========================================
// CREATE MEMBER
// ==========================================
exports.createMember = catchAsync(async (req, res, next) => {
  const { name, phoneNumber, trainingType, packageId, coachId, paymentMethod, gender } = req.body;
  const gymId = req.user.gymId;

  if (!packageId) {
    return next(new AppError('Please provide a packageId', 400));
  }
  
  if (!paymentMethod) {
    return next(new AppError('Please provide a paymentMethod (cash or card)', 400));
  }

  // Validate UUID formats
  if (!isUuid(packageId)) {
    return next(new AppError('Invalid package selected', 400));
  }

  if (coachId && coachId !== 'none' && !isUuid(coachId)) {
    return next(new AppError('Invalid coach selected', 400));
  }

  // Use a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Validate the Package
    const pkg = await tx.package.findUnique({
      where: { id: packageId }
    });

    if (!pkg || pkg.gymId !== gymId) {
      throw new AppError('Invalid package selected', 400);
    }

    // 2. Calculate Subscription End Date
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + pkg.durationInDays);

    // 3. Create the Member
    const qrCode = uuidv4();
    const newMember = await tx.member.create({
      data: {
        gymId,
        name,
        phoneNumber,
        trainingType,
        coachId: trainingType === 'Private' ? coachId : null,
        qrCode,
        status: 'active',
        subscriptionEnd,
        activePackageId: packageId,
        gender: gender || 'Male',
        branchId: req.user.branchId || req.body.branchId || null
      }
    });

    // 4. Create Financial Log for the income
    await tx.financialLog.create({
      data: {
        gymId,
        type: 'income',
        category: 'subscription',
        amount: pkg.price,
        description: `Subscription payment for ${name} - Package: ${pkg.name} (${paymentMethod})`,
        refId: newMember.id
      }
    });

    return { newMember, pkg };
  });

  // Fire-and-forget WA welcome message with QR image pass
  notifyWhatsApp(req.user.gymId, phoneNumber, name, result.newMember.qrCode);

  res.status(201).json({
    status: 'success',
    message: 'Member registered and subscribed successfully',
    data: { member: result.newMember }
  });
});

// ==========================================
// UPDATE MEMBER
// ==========================================
exports.updateMember = catchAsync(async (req, res, next) => {
  const { status, name, phoneNumber, trainingType, coachId, activePackageId, packageId, gender } = req.body;
  const finalPackageId = activePackageId || packageId;
  const gymId = req.user.gymId;

  // Validate UUID formats
  if (!isUuid(req.params.id)) {
    return next(new AppError('Invalid member ID format', 400));
  }

  if (finalPackageId) {
    if (!isUuid(finalPackageId)) {
      return next(new AppError('Invalid package selected', 400));
    }
    const pkg = await prisma.package.findUnique({
      where: { id: finalPackageId }
    });
    if (!pkg || pkg.gymId !== gymId) {
      return next(new AppError('Invalid package selected', 400));
    }
  }

  if (coachId && coachId !== 'none' && !isUuid(coachId)) {
    return next(new AppError('Invalid coach selected', 400));
  }

  const updatedMember = await prisma.member.updateMany({
    where: { id: req.params.id, gymId: gymId },
    data: {
      status,
      name,
      phoneNumber,
      trainingType,
      coachId: trainingType === 'Private' ? (coachId === 'none' || coachId === '' ? null : coachId) : null,
      activePackageId: finalPackageId,
      gender,
      branchId: req.body.branchId !== undefined ? (req.body.branchId === 'none' || req.body.branchId === '' ? null : req.body.branchId) : undefined
    }
  });

  if (updatedMember.count === 0) {
    return next(new AppError('No member found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Member updated successfully'
  });
});

// ==========================================
// DELETE MEMBER
// ==========================================
exports.deleteMember = catchAsync(async (req, res, next) => {
  const deletedMember = await prisma.member.deleteMany({
    where: {
      id: req.params.id,
      gymId: req.user.gymId
    }
  });

  if (deletedMember.count === 0) {
    return next(new AppError('No member found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.notifyWhatsApp       = notifyWhatsApp;
exports.sendWhatsAppReminder = sendWhatsAppReminder;

