const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const prisma = require('../prisma/client');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Helper to notify via WhatsApp microservice
const notifyWhatsApp = async (gymId, phoneNumber, message, qrCode) => {
  try {
    if (process.env.WHATSAPP_SERVICE_URL) {
      await axios.post(process.env.WHATSAPP_SERVICE_URL, {
        gymId,
        phoneNumber,
        message,
        qrCode
      });
    }
  } catch (err) {
    console.error('WhatsApp notification failed:', err.message);
  }
};

// ==========================================
// GET ALL MEMBERS
// ==========================================
exports.getAllMembers = catchAsync(async (req, res, next) => {
  const members = await prisma.member.findMany({
    where: { gymId: req.user.gymId },
    include: {
      coach: { select: { name: true } },
      activePackage: { select: { name: true, durationInDays: true } }
    }
  });

  res.status(200).json({
    status: 'success',
    results: members.length,
    data: { members }
  });
});

// ==========================================
// CREATE MEMBER
// ==========================================
exports.createMember = catchAsync(async (req, res, next) => {
  const { name, phoneNumber, trainingType, packageId, coachId, paymentMethod } = req.body;
  const gymId = req.user.gymId;

  if (!packageId) {
    return next(new AppError('Please provide a packageId', 400));
  }
  
  if (!paymentMethod) {
    return next(new AppError('Please provide a paymentMethod (cash or card)', 400));
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
        activePackageId: packageId
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

  const message = `Welcome to Flexora, ${name}! Your subscription to ${result.pkg.name} is active until ${result.newMember.subscriptionEnd.toDateString()}.`;
  await notifyWhatsApp(req.user.gymId, phoneNumber, message, result.newMember.qrCode);

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
  const { status, name, phoneNumber, trainingType, coachId, activePackageId } = req.body;

  const updatedMember = await prisma.member.updateMany({
    where: { id: req.params.id, gymId: req.user.gymId },
    data: { status, name, phoneNumber, trainingType, coachId, activePackageId }
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

exports.notifyWhatsApp = notifyWhatsApp;
