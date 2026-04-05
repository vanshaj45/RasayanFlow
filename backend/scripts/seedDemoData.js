const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Lab = require('../models/Lab');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');
const StoreItem = require('../models/StoreItem');
const StoreAllotment = require('../models/StoreAllotment');

const DEMO_PASSWORD = 'Demo@123';

const users = [
  {
    key: 'superAdmin',
    name: 'Vanshaj Bairagi',
    email: 'vanshajbairagi10@gmail.com',
    role: 'superAdmin',
    isApproved: true,
  },
  {
    key: 'labAdminJunaid',
    name: 'Junaid Khan',
    email: 'junaid.labadmin@pharmlab.demo',
    role: 'labAdmin',
    isApproved: true,
  },
  {
    key: 'labAdminAarav',
    name: 'Aarav Mehta',
    email: 'aarav.labadmin@pharmlab.demo',
    role: 'labAdmin',
    isApproved: true,
  },
  {
    key: 'studentSara',
    name: 'Sara Ali',
    email: 'sara.student@pharmlab.demo',
    role: 'student',
    isApproved: true,
  },
  {
    key: 'studentPriya',
    name: 'Priya Sharma',
    email: 'priya.student@pharmlab.demo',
    role: 'student',
    isApproved: true,
  },
  {
    key: 'studentRohit',
    name: 'Rohit Verma',
    email: 'rohit.student@pharmlab.demo',
    role: 'student',
    isApproved: true,
  },
  {
    key: 'storeAdminNisha',
    name: 'Nisha Patel',
    email: 'nisha.storeadmin@pharmlab.demo',
    role: 'storeAdmin',
    isApproved: true,
  },
];

const labs = [
  { key: 'pharmaceutics', labName: 'Pharmaceutics Lab', labCode: 'PHARM-01', adminKey: 'labAdminJunaid' },
  { key: 'pharmacology', labName: 'Pharmacology Lab', labCode: 'PHARM-02', adminKey: 'labAdminJunaid' },
  { key: 'biochemistry', labName: 'Biochemistry Lab', labCode: 'BIO-01', adminKey: 'labAdminJunaid' },
];

const inventorySeed = [
  {
    labKey: 'pharmaceutics',
    itemCode: 'AMOX-250',
    itemName: 'Amoxicillin 250mg Capsules',
    category: 'Antibiotics',
    quantity: 18,
    quantityUnit: 'boxes',
    minThreshold: 12,
    storageLocation: 'Cabinet A1',
    lotNumber: 'AMX2401',
    expiryDate: '2026-06-15',
    abstract: 'Amoxicillin is a Beta-lactam antibiotic from the aminopenicillin family used to treat bacterial infections including upper respiratory tract infections, otitis media, sinusitis, bronchitis and urinary tract infections. It is commonly used in pediatric formulations due to its safety profile and oral bioavailability. The drug undergoes minimal hepatic metabolism and is primarily excreted unchanged in urine.',
    pubmedId: '26866690',
  },
  {
    labKey: 'pharmaceutics',
    itemCode: 'PCM-500',
    itemName: 'Paracetamol 500mg Tablets',
    category: 'Analgesics',
    quantity: 9,
    quantityUnit: 'boxes',
    minThreshold: 15,
    storageLocation: 'Rack B2',
    lotNumber: 'PCM2408',
    expiryDate: '2026-04-20',
    abstract: 'Paracetamol (acetaminophen) is a widely used non-prescription analgesic and antipyretic agent effective for pain relief and fever reduction. It is considered safer than NSAIDs in certain patient populations including those with gastrointestinal or renal complications. The molecular mechanism involves inhibition of prostaglandin synthesis primarily in the CNS. Overdose can result in hepatotoxicity requiring immediate management with N-acetylcysteine.',
    pubmedId: '19946359',
  },
  {
    labKey: 'pharmaceutics',
    itemCode: 'IV-NS',
    itemName: 'Normal Saline 500mL',
    category: 'IV Fluids',
    quantity: 4,
    quantityUnit: 'bottles',
    minThreshold: 10,
    storageLocation: 'Cold Shelf 1',
    lotNumber: 'NS2410',
    expiryDate: '2026-04-10',
    abstract: 'Normal saline solution (0.9% sodium chloride) is an isotonic crystalloid fluid widely used in clinical practice for intravenous administration and fluid resuscitation. Its osmolarity matches plasma osmolarity reducing cellular edema risk. It is utilized in volume replacement therapy, medication dilution and maintaining intravenous access patency. Despite widespread use, prolonged administration can lead to hyperchloremic acidosis.',
    pubmedId: '28975656',
  },
  {
    labKey: 'pharmaceutics',
    itemCode: 'SYR-5',
    itemName: '5mL Sterile Syringes',
    category: 'Consumables',
    quantity: 56,
    quantityUnit: 'packs',
    minThreshold: 20,
    storageLocation: 'Drawer C3',
    lotNumber: 'SYR2502',
    expiryDate: '2027-01-30',
  },
  {
    labKey: 'pharmaceutics',
    itemCode: 'GLV-NTR',
    itemName: 'Nitrile Gloves',
    category: 'Consumables',
    quantity: 7,
    quantityUnit: 'boxes',
    minThreshold: 18,
    storageLocation: 'Drawer C1',
    lotNumber: 'GLV2412',
    expiryDate: '2026-05-05',
  },
  {
    labKey: 'pharmacology',
    itemCode: 'ATR-1ML',
    itemName: 'Atropine Injection 1mL',
    category: 'Emergency Drugs',
    quantity: 11,
    quantityUnit: 'vials',
    minThreshold: 8,
    storageLocation: 'Emergency Tray',
    lotNumber: 'ATR2501',
    expiryDate: '2026-08-12',
    abstract: 'Atropine is an anticholinergic drug that acts as a competitive antagonist at muscarinic acetylcholine receptors. It is used in emergency medicine for bradycardia management, organophosphate poisoning treatment, and as an antimuscarinic premedication. The drug exhibits rapid onset of action with peak effects within 30 minutes of intramuscular administration. Common side effects include dry mouth, tachycardia and mydriasis.',
    pubmedId: '10847856',
  },
  {
    labKey: 'pharmacology',
    itemCode: 'DIAZ-10',
    itemName: 'Diazepam 10mg',
    category: 'Sedatives',
    quantity: 5,
    quantityUnit: 'boxes',
    minThreshold: 10,
    storageLocation: 'Cabinet D2',
    lotNumber: 'DZ2409',
    expiryDate: '2026-04-18',
    abstract: 'Diazepam is a long-acting benzodiazepine used for anxiety disorders, muscle spasticity, seizure prophylaxis and as a sedative-hypnotic. It enhances GABA-mediated chloride channel opening in the central nervous system. The drug has a long half-life (20-70 hours) with active metabolites contributing to prolonged pharmacological effects. Risk of dependence and withdrawal symptoms exists with chronic use requiring gradual tapering.',
    pubmedId: '8804524',
  },
  {
    labKey: 'pharmacology',
    itemCode: 'PRO-20',
    itemName: 'Propranolol 20mg Tablets',
    category: 'Cardiovascular Drugs',
    quantity: 14,
    quantityUnit: 'boxes',
    minThreshold: 10,
    storageLocation: 'Cabinet D3',
    lotNumber: 'PRO2411',
    expiryDate: '2026-09-14',
    abstract: 'Propranolol is a non-selective beta-adrenergic blocker used in hypertension, arrhythmias, migraine prophylaxis and anxiety-related symptoms. It reduces heart rate and blood pressure by blocking beta receptors. Care is required in patients with asthma, bradycardia or certain conduction abnormalities because of risk of bronchospasm and excessive cardiac suppression.',
    pubmedId: '7011014',
  },
  {
    labKey: 'pharmacology',
    itemCode: 'MET-500',
    itemName: 'Metformin 500mg Tablets',
    category: 'Antidiabetics',
    quantity: 20,
    quantityUnit: 'boxes',
    minThreshold: 12,
    storageLocation: 'Cabinet D1',
    lotNumber: 'MET2407',
    expiryDate: '2026-11-22',
    abstract: 'Metformin is a biguanide antidiabetic agent widely used as first-line therapy for type 2 diabetes mellitus. It decreases hepatic glucose production and improves insulin sensitivity. Common adverse effects include gastrointestinal upset, while lactic acidosis is a rare but serious concern in predisposed patients.',
    pubmedId: '28880872',
  },
  {
    labKey: 'pharmacology',
    itemCode: 'LID-2',
    itemName: 'Lidocaine 2% Injection',
    category: 'Local Anesthetics',
    quantity: 12,
    quantityUnit: 'vials',
    minThreshold: 8,
    storageLocation: 'Emergency Tray 2',
    lotNumber: 'LID2504',
    expiryDate: '2026-10-30',
    abstract: 'Lidocaine is an amide local anesthetic and class Ib antiarrhythmic drug used for local infiltration, nerve block, and certain ventricular arrhythmias. It blocks voltage-gated sodium channels to prevent impulse conduction. Toxicity may present with CNS symptoms, numbness, or cardiac effects, so dosing and monitoring are critical.',
    pubmedId: '16192766',
  },
  {
    labKey: 'biochemistry',
    itemCode: 'GLU-100',
    itemName: 'Glucose 100g',
    category: 'Carbohydrates',
    quantity: 16,
    quantityUnit: 'packs',
    minThreshold: 10,
    storageLocation: 'Shelf B1',
    lotNumber: 'GLU2405',
    expiryDate: '2027-02-12',
    abstract: 'Glucose is a simple monosaccharide central to cellular energy metabolism and many biochemical assays. It is routinely used as a substrate in enzyme studies, calibration standards, and practical demonstrations of carbohydrate chemistry. In solution, it participates in oxidation, fermentation, and measurement workflows across laboratory experiments.',
    pubmedId: '2682170',
  },
  {
    labKey: 'biochemistry',
    itemCode: 'BSA-50',
    itemName: 'Bovine Serum Albumin',
    category: 'Proteins',
    quantity: 8,
    quantityUnit: 'bottles',
    minThreshold: 5,
    storageLocation: 'Cold Shelf B2',
    lotNumber: 'BSA2410',
    expiryDate: '2026-12-18',
    abstract: 'Bovine serum albumin is a widely used protein reagent in biochemistry and molecular biology. It serves as a blocking agent, protein standard, and stabilizer in assays and sample preparation. It is frequently used in ELISA, electrophoresis, and enzyme-based laboratory procedures to reduce nonspecific binding.',
    pubmedId: '8444317',
  },
  {
    labKey: 'biochemistry',
    itemCode: 'TRIS-BASE',
    itemName: 'Tris Base',
    category: 'Buffers',
    quantity: 11,
    quantityUnit: 'packs',
    minThreshold: 7,
    storageLocation: 'Shelf B3',
    lotNumber: 'TRI2412',
    expiryDate: '2027-03-25',
    abstract: 'Tris base is an organic buffering reagent widely used to maintain pH in biochemical and molecular biology experiments. It is a core component of electrophoresis and sample preparation buffers. The compound is selected for its useful buffering range near physiological pH and its compatibility with many laboratory workflows.',
    pubmedId: '6765122',
  },
  {
    labKey: 'biochemistry',
    itemCode: 'DNA-MARK',
    itemName: 'DNA Marker Set',
    category: 'Molecular Biology',
    quantity: 13,
    quantityUnit: 'sets',
    minThreshold: 6,
    storageLocation: 'Freezer Rack B4',
    lotNumber: 'DNA2503',
    expiryDate: '2026-11-05',
    abstract: 'DNA marker sets are used as size references in gel electrophoresis and molecular biology workflows. They help estimate nucleic acid fragment sizes in teaching and research experiments. Proper storage and handling preserve band resolution and reproducibility across assay runs.',
    pubmedId: '12123456',
  },
];

const storeSeed = [
  {
    itemCode: 'GLF-001',
    itemName: 'Glass Funnel',
    category: 'Glassware',
    subCategory: 'Funnels',
    quantity: 14,
    quantityUnit: 'pieces',
    storageLocation: 'Store Shelf G1',
    description: 'Standard laboratory glass funnel for filtration and transfer.',
  },
  {
    itemCode: 'BKR-250',
    itemName: '250mL Beaker',
    category: 'Glassware',
    subCategory: 'Beakers',
    quantity: 22,
    quantityUnit: 'pieces',
    storageLocation: 'Store Shelf G2',
    description: 'Borosilicate beaker for general mixing and heating.',
  },
  {
    itemCode: 'PIP-GRAD',
    itemName: 'Graduated Pipette',
    category: 'Glassware',
    subCategory: 'Pipettes',
    quantity: 9,
    quantityUnit: 'pieces',
    storageLocation: 'Store Shelf G3',
    description: 'Graduated glass pipette for measured liquid transfer.',
  },
  {
    itemCode: 'ETH-500',
    itemName: 'Ethanol 500mL',
    category: 'Chemical',
    subCategory: 'Solvents',
    quantity: 12,
    quantityUnit: 'mL',
    storageLocation: 'Chemical Cabinet C1',
    description: 'Lab-grade ethanol for formulation and cleaning.',
    abstract: 'Ethanol (ethyl alcohol) is a volatile organic compound widely used as a solvent in pharmaceutical formulations, laboratory applications and industrial processes. It exhibits antimicrobial properties making it useful for surface sterilization and sanitization. The compound is miscible with water and many organic solvents. Handling requires appropriate ventilation and safety precautions due to its flammability and CNS depressant effects upon exposure.',
    pubmedId: '24980863',
  },
  {
    itemCode: 'HCL-250',
    itemName: 'Hydrochloric Acid',
    category: 'Chemical',
    subCategory: 'Acids',
    quantity: 5,
    quantityUnit: 'L',
    storageLocation: 'Chemical Cabinet C2',
    description: 'Diluted hydrochloric acid used for standard lab reactions.',
    abstract: 'Hydrochloric acid is a strong inorganic acid consisting of hydrogen chloride dissolved in water. It is commonly used in pharmaceutical analysis, pH adjustment and chemical synthesis. The compound is highly corrosive and requires careful handling with appropriate personal protective equipment. Diluted solutions are used extensively in laboratory titrations and as a pH buffer. Proper storage in glass containers away from bases and reactive metals is essential.',
    pubmedId: '21513882',
  },
];

const demoLog = (message) => {
  console.log(`[demo-seed] ${message}`);
};

async function upsertUser(entry) {
  let user = await User.findOne({ email: entry.email });
  if (!user) {
    user = new User({
      name: entry.name,
      email: entry.email,
      password: DEMO_PASSWORD,
      role: entry.role,
      isApproved: entry.isApproved,
    });
  } else {
    user.name = entry.name;
    user.role = entry.role;
    user.isApproved = entry.isApproved;
    user.password = DEMO_PASSWORD;
  }

  await user.save();
  return user;
}

async function run() {
  await connectDB();
  demoLog('Connected to database');

  const userMap = {};
  for (const entry of users) {
    userMap[entry.key] = await upsertUser(entry);
  }

  const labMap = {};
  for (const entry of labs) {
    let lab = await Lab.findOne({ labCode: entry.labCode });
    if (!lab) {
      lab = await Lab.create({
        labName: entry.labName,
        labCode: entry.labCode,
        createdBy: userMap.superAdmin._id,
        admins: [],
      });
    } else {
      lab.labName = entry.labName;
      lab.createdBy = userMap.superAdmin._id;
    }

    lab.admins = [userMap[entry.adminKey]._id];
    await lab.save();
    labMap[entry.key] = lab;

    const labAdmin = userMap[entry.adminKey];
    if (!labAdmin.labId) {
      labAdmin.labId = lab._id;
    }
    labAdmin.role = 'labAdmin';
    labAdmin.isApproved = true;
    await labAdmin.save();
  }

  for (const studentKey of ['studentSara', 'studentPriya', 'studentRohit']) {
    userMap[studentKey].labId = labMap.pharmaceutics._id;
    userMap[studentKey].isApproved = true;
    userMap[studentKey].role = 'student';
    await userMap[studentKey].save();
  }

  userMap.storeAdminNisha.labId = null;
  userMap.storeAdminNisha.role = 'storeAdmin';
  userMap.storeAdminNisha.isApproved = true;
  await userMap.storeAdminNisha.save();

  const inventoryMap = {};
  for (const entry of inventorySeed) {
    const lab = labMap[entry.labKey];
    const existing = await Inventory.findOne({ labId: lab._id, itemCode: entry.itemCode });
    const payload = {
      labId: lab._id,
      itemCode: entry.itemCode,
      itemName: entry.itemName,
      category: entry.category,
      quantity: entry.quantity,
      quantityUnit: entry.quantityUnit,
      minThreshold: entry.minThreshold,
      storageLocation: entry.storageLocation,
      lotNumber: entry.lotNumber,
      expiryDate: new Date(entry.expiryDate),
      abstract: entry.abstract || '',
      pubmedId: entry.pubmedId || '',
      lastUpdated: new Date(),
    };

    let item;
    if (!existing) {
      item = await Inventory.create(payload);
    } else {
      Object.assign(existing, payload);
      item = await existing.save();
    }

    inventoryMap[`${entry.labKey}:${entry.itemCode}`] = item;
  }

  const demoUserIds = Object.values(userMap).map((user) => user._id);
  const demoItemIds = Object.values(inventoryMap).map((item) => item._id);
  await Transaction.deleteMany({ $or: [{ userId: { $in: demoUserIds } }, { itemId: { $in: demoItemIds } }] });
  await ActivityLog.deleteMany({ userId: { $in: demoUserIds } });
  await StoreItem.deleteMany({ itemCode: { $in: [...storeSeed.map((item) => item.itemCode), 'MRT-STD', 'SPAT-SS'] } });
  await StoreAllotment.deleteMany({ studentId: { $in: demoUserIds } });

  for (const entry of storeSeed) {
    await StoreItem.create({ ...entry, lastUpdated: new Date() });
  }

  const storeItemDocs = await StoreItem.find({ itemCode: { $in: storeSeed.map((item) => item.itemCode) } });
  const storeItemMap = Object.fromEntries(storeItemDocs.map((item) => [item.itemCode, item]));

  const transactions = [
    {
      userId: userMap.studentSara._id,
      labId: labMap.pharmaceutics._id,
      itemId: inventoryMap['pharmaceutics:PCM-500']._id,
      quantity: 3,
      type: 'borrow',
      status: 'pending',
      purpose: 'Tablet dissolution comparison',
      neededUntil: new Date('2026-04-07'),
      requesterName: userMap.studentSara.name,
      requesterEmail: userMap.studentSara.email,
      notes: 'Need for afternoon batch',
      timestamp: new Date('2026-04-03T08:30:00Z'),
    },
    {
      userId: userMap.studentPriya._id,
      labId: labMap.pharmaceutics._id,
      itemId: inventoryMap['pharmaceutics:SYR-5']._id,
      quantity: 2,
      type: 'borrow',
      status: 'approved',
      purpose: 'Sterility practice session',
      neededUntil: new Date('2026-04-05'),
      requesterName: userMap.studentPriya.name,
      requesterEmail: userMap.studentPriya.email,
      reviewedBy: userMap.labAdminJunaid._id,
      reviewedAt: new Date('2026-04-02T10:45:00Z'),
      reviewNotes: 'Approved for scheduled lab.',
      timestamp: new Date('2026-04-02T10:15:00Z'),
    },
    {
      userId: userMap.studentRohit._id,
      labId: labMap.pharmaceutics._id,
      itemId: inventoryMap['pharmaceutics:GLV-NTR']._id,
      quantity: 1,
      type: 'borrow',
      status: 'rejected',
      purpose: 'Extra safety stock',
      neededUntil: new Date('2026-04-04'),
      requesterName: userMap.studentRohit.name,
      requesterEmail: userMap.studentRohit.email,
      reviewedBy: userMap.labAdminJunaid._id,
      reviewedAt: new Date('2026-04-01T11:30:00Z'),
      reviewNotes: 'Use shared stock from the practical tray.',
      timestamp: new Date('2026-04-01T10:50:00Z'),
    },
    {
      userId: userMap.labAdminJunaid._id,
      labId: labMap.pharmaceutics._id,
      itemId: inventoryMap['pharmaceutics:IV-NS']._id,
      quantity: 2,
      type: 'return',
      status: 'completed',
      requesterName: userMap.labAdminJunaid.name,
      requesterEmail: userMap.labAdminJunaid.email,
      timestamp: new Date('2026-04-02T14:20:00Z'),
    },
    {
      userId: userMap.labAdminAarav._id,
      labId: labMap.pharmacology._id,
      itemId: inventoryMap['pharmacology:DIAZ-10']._id,
      quantity: 2,
      type: 'borrow',
      status: 'approved',
      purpose: 'Sedative drug handling demonstration',
      neededUntil: new Date('2026-04-06'),
      requesterName: userMap.labAdminAarav.name,
      requesterEmail: userMap.labAdminAarav.email,
      reviewedBy: userMap.superAdmin._id,
      reviewedAt: new Date('2026-04-03T06:20:00Z'),
      reviewNotes: 'Approved for supervised lab block.',
      timestamp: new Date('2026-04-03T06:00:00Z'),
    },
  ];

  await Transaction.insertMany(transactions);

  await StoreAllotment.insertMany([
    {
      storeItemId: storeItemMap['GLF-001']._id,
      studentId: userMap.studentSara._id,
      allottedBy: userMap.storeAdminNisha._id,
      quantity: 2,
      quantityUnit: 'pieces',
      status: 'approved',
      purpose: 'Filtration practical',
      notes: 'Handle carefully and return clean.',
      dueDate: new Date('2026-04-05'),
      timestamp: new Date('2026-04-03T07:40:00Z'),
    },
    {
      storeItemId: storeItemMap['ETH-500']._id,
      studentId: userMap.studentPriya._id,
      allottedBy: userMap.storeAdminNisha._id,
      quantity: 100,
      quantityUnit: 'mL',
      status: 'approved',
      purpose: 'Surface cleaning and bench prep',
      notes: 'Return unused amount with label intact.',
      dueDate: new Date('2026-04-07'),
      timestamp: new Date('2026-04-03T07:55:00Z'),
    },
    {
      storeItemId: storeItemMap['BKR-250']._id,
      studentId: userMap.studentSara._id,
      allottedBy: userMap.studentSara._id,
      quantity: 1,
      quantityUnit: 'pieces',
      status: 'pending',
      purpose: 'Solution preparation practical',
      requestNotes: 'Need one beaker for tomorrow morning lab.',
      dueDate: new Date('2026-04-08'),
      timestamp: new Date('2026-04-03T08:10:00Z'),
    },
  ]);

  await ActivityLog.insertMany([
    {
      userId: userMap.superAdmin._id,
      action: 'seed_demo_data',
      details: 'Loaded PharmLab demo environment',
      entityType: 'system',
      metadata: { labs: labs.length, inventoryItems: inventorySeed.length },
      timestamp: new Date('2026-04-03T05:50:00Z'),
    },
    {
      userId: userMap.superAdmin._id,
      action: 'create_lab',
      details: `Lab ${labMap.pharmaceutics.labName} (${labMap.pharmaceutics.labCode}) ready for demo`,
      entityType: 'lab',
      entityId: labMap.pharmaceutics._id,
      timestamp: new Date('2026-04-03T05:52:00Z'),
    },
    {
      userId: userMap.superAdmin._id,
      action: 'assign_admin',
      details: `Assigned ${userMap.labAdminJunaid.email} to lab ${labMap.pharmaceutics.labCode}`,
      entityType: 'lab',
      entityId: labMap.pharmaceutics._id,
      timestamp: new Date('2026-04-03T05:54:00Z'),
    },
    {
      userId: userMap.labAdminJunaid._id,
      action: 'update_item',
      details: `Updated item ${inventoryMap['pharmaceutics:PCM-500'].itemName} (${inventoryMap['pharmaceutics:PCM-500'].itemCode})`,
      entityType: 'inventory',
      entityId: inventoryMap['pharmaceutics:PCM-500']._id,
      metadata: {
        before: { quantity: 12, minThreshold: 15 },
        after: { quantity: 9, minThreshold: 15 },
      },
      timestamp: new Date('2026-04-03T06:30:00Z'),
    },
    {
      userId: userMap.labAdminJunaid._id,
      action: 'low_stock_alert',
      details: `${inventoryMap['pharmaceutics:GLV-NTR'].itemName} is below threshold`,
      entityType: 'inventory',
      entityId: inventoryMap['pharmaceutics:GLV-NTR']._id,
      timestamp: new Date('2026-04-03T06:45:00Z'),
    },
    {
      userId: userMap.labAdminJunaid._id,
      action: 'approve_borrow_request',
      details: `Approved borrow request for ${inventoryMap['pharmaceutics:SYR-5'].itemName}`,
      entityType: 'transaction',
      timestamp: new Date('2026-04-03T07:05:00Z'),
    },
    {
      userId: userMap.storeAdminNisha._id,
      action: 'create_store_item',
      details: 'Created store item Glass Funnel (GLF-001)',
      entityType: 'storeItem',
      timestamp: new Date('2026-04-03T07:15:00Z'),
    },
  ]);

  demoLog('Demo users');
  demoLog(`Super admin: ${userMap.superAdmin.email} / ${DEMO_PASSWORD}`);
  demoLog(`Lab admin: ${userMap.labAdminJunaid.email} / ${DEMO_PASSWORD}`);
  demoLog(`Store admin: ${userMap.storeAdminNisha.email} / ${DEMO_PASSWORD}`);
  demoLog(`Student: ${userMap.studentSara.email} / ${DEMO_PASSWORD}`);
  demoLog('Demo data seeded successfully');
}

run()
  .catch((error) => {
    console.error('[demo-seed] Failed to seed demo data');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
