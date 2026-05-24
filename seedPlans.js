const prisma = require('./prisma/client');

async function seed() {
  console.log('Seeding SaaS plans...');
  
  // Clean existing ones to refresh fields
  await prisma.saasPlan.deleteMany();
  console.log('Cleared existing SaaS plans.');

  const plans = [
    { 
      planName: 'الباقة الأساسية (1 شهر)', 
      durationInDays: 30, 
      price: 500,
      description: 'الباقة الأساسية',
      maxReceptionists: 1,
      maxCoaches: 2,
      features: [
        'أتمتة ملفات واشتراكات الأعضاء الأساسية',
        'توليد وتشفير كود الدخول الرقمي (QR)',
        'صلاحية وصول لواجهة استقبال واحدة (Reception Desk)'
      ]
    },
    { 
      planName: 'الباقة المتقدمة (3 أشهر) — الأكثر طلباً', 
      durationInDays: 90, 
      price: 1200,
      description: 'الباقة المتقدمة',
      maxReceptionists: 2,
      maxCoaches: 4,
      features: [
        'توفير مالي بمعدل 20% مقارنة بالدفع الشهري',
        'لوحة التقارير المالية والإحصائيات التحليلية',
        'توليد وطباعة بطاقات العضوية المشفرة (CR80)',
        'صلاحيات منفصلة للإدارة العليا وطاقم الاستقبال'
      ]
    },
    { 
      planName: 'الباقة الاحترافية (6 أشهر)', 
      durationInDays: 180, 
      price: 2200,
      description: 'الباقة الاحترافية',
      maxReceptionists: 3,
      maxCoaches: 6,
      features: [
        'توفير مالي بمعدل 27% مقارنة بالدفع الشهري',
        'تفعيل محرك المحاسبة المالي الموحد V2 بالكامل',
        'ربط بوابات الحضور الإلكترونية الذكية بشكل غير محدود',
        'دعم فني مخصص وخط ساخن للاستشارات التقنية'
      ]
    },
    { 
      planName: 'منظومة الأعمال الشاملة (سنة كاملة) — أفضل قيمة', 
      durationInDays: 365, 
      price: 4000,
      description: 'منظومة الأعمال الشاملة',
      maxReceptionists: 5,
      maxCoaches: 12,
      features: [
        'توفير استثنائي بمعدل 33% من القيمة الإجمالية',
        'إدارة وحسابات فروع متعددة ومنفصلة (Multi-Branch Core)',
        'تصدير فوري لكافة التقارير المالية والمحاسبية لملفات Excel/PDF',
        'أولوية قصوى في الدعم التقني وجلسات استشارية لتطوير الأعمال'
      ]
    }
  ];

  for (const plan of plans) {
    await prisma.saasPlan.create({ data: plan });
  }

  console.log('SaaS plans seeded successfully!');
}

seed()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
