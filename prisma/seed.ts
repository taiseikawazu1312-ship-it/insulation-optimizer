import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hash } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

async function main() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding database...");

  // Organization
  const orgId = uuidv4();
  await prisma.organization.create({
    data: {
      id: orgId,
      name: "省エネ設計事務所",
      slug: "energy-design",
      plan: "free",
      maxUsers: 10,
      isActive: true,
    },
  });
  console.log("Created organization: 省エネ設計事務所");

  // Users
  const adminPasswordHash = await hash("password123", 10);
  const operatorPasswordHash = await hash("password123", 10);

  await prisma.user.createMany({
    data: [
      {
        id: uuidv4(),
        organizationId: orgId,
        email: "admin@example.com",
        name: "管理者",
        passwordHash: adminPasswordHash,
        role: "admin",
        isActive: true,
      },
      {
        id: uuidv4(),
        organizationId: orgId,
        email: "operator@example.com",
        name: "オペレーター",
        passwordHash: operatorPasswordHash,
        role: "operator",
        isActive: true,
      },
    ],
  });
  console.log("Created users: admin@example.com, operator@example.com");

  // Insulation Materials
  const insulationMaterials = [
    {
      name: "高性能GW 16K",
      category: "glass_wool",
      conductivity: 0.038,
      applicableParts: JSON.stringify(["wall", "ceiling", "roof"]),
      thicknessOptions: JSON.stringify([100, 105, 120, 155, 200]),
      unitPricePerM2: JSON.stringify({ "100": 1500, "105": 1600, "120": 1900, "155": 2400, "200": 3000 }),
    },
    {
      name: "高性能GW 24K",
      category: "glass_wool",
      conductivity: 0.036,
      applicableParts: JSON.stringify(["wall", "ceiling"]),
      thicknessOptions: JSON.stringify([100, 105, 120, 155]),
      unitPricePerM2: JSON.stringify({ "100": 2000, "105": 2100, "120": 2400, "155": 3000 }),
    },
    {
      name: "高性能GW 32K",
      category: "glass_wool",
      conductivity: 0.035,
      applicableParts: JSON.stringify(["wall"]),
      thicknessOptions: JSON.stringify([80, 100, 105]),
      unitPricePerM2: JSON.stringify({ "80": 2200, "100": 2800, "105": 3000 }),
    },
    {
      name: "ロックウール",
      category: "rock_wool",
      conductivity: 0.038,
      applicableParts: JSON.stringify(["wall", "ceiling"]),
      thicknessOptions: JSON.stringify([60, 75, 90, 100]),
      unitPricePerM2: JSON.stringify({ "60": 1500, "75": 1800, "90": 2100, "100": 2400 }),
    },
    {
      name: "硬質ウレタンフォーム1種",
      category: "urethane_foam",
      conductivity: 0.024,
      applicableParts: JSON.stringify(["wall", "roof", "foundation"]),
      thicknessOptions: JSON.stringify([25, 30, 35, 40, 50, 60]),
      unitPricePerM2: JSON.stringify({ "25": 2500, "30": 2800, "35": 3200, "40": 3500, "50": 4200, "60": 5000 }),
    },
    {
      name: "硬質ウレタンフォーム2種",
      category: "urethane_foam",
      conductivity: 0.023,
      applicableParts: JSON.stringify(["wall", "roof", "foundation"]),
      thicknessOptions: JSON.stringify([30, 40, 50, 60]),
      unitPricePerM2: JSON.stringify({ "30": 3000, "40": 3800, "50": 4500, "60": 5500 }),
    },
    {
      name: "フェノールフォーム",
      category: "phenol_foam",
      conductivity: 0.020,
      applicableParts: JSON.stringify(["wall", "roof", "floor", "foundation"]),
      thicknessOptions: JSON.stringify([25, 30, 35, 40, 45, 50, 60, 66, 80, 90, 100]),
      unitPricePerM2: JSON.stringify({ "25": 3500, "30": 3800, "35": 4200, "40": 4500, "45": 5000, "50": 5500, "60": 6200, "66": 6800, "80": 7500, "90": 8200, "100": 9000 }),
    },
    {
      name: "XPS 3種bA",
      category: "xps",
      conductivity: 0.028,
      applicableParts: JSON.stringify(["floor", "foundation"]),
      thicknessOptions: JSON.stringify([25, 30, 40, 50, 60, 75, 100]),
      unitPricePerM2: JSON.stringify({ "25": 1800, "30": 2000, "40": 2500, "50": 3000, "60": 3500, "75": 4200, "100": 5500 }),
    },
    {
      name: "EPS特号",
      category: "eps",
      conductivity: 0.034,
      applicableParts: JSON.stringify(["floor", "foundation", "wall"]),
      thicknessOptions: JSON.stringify([25, 30, 40, 50, 60, 75, 100]),
      unitPricePerM2: JSON.stringify({ "25": 1200, "30": 1400, "40": 1800, "50": 2200, "60": 2600, "75": 3200, "100": 4000 }),
    },
    {
      name: "セルロースファイバー",
      category: "cellulose_fiber",
      conductivity: 0.040,
      applicableParts: JSON.stringify(["wall", "ceiling", "roof"]),
      thicknessOptions: JSON.stringify([105, 120, 200, 300]),
      unitPricePerM2: JSON.stringify({ "105": 3000, "120": 3500, "200": 5500, "300": 7000 }),
    },
    {
      name: "吹付硬質ウレタンA種1",
      category: "spray_urethane",
      conductivity: 0.034,
      applicableParts: JSON.stringify(["wall", "roof"]),
      thicknessOptions: JSON.stringify([60, 80, 90, 100, 105]),
      unitPricePerM2: JSON.stringify({ "60": 2500, "80": 3200, "90": 3600, "100": 4000, "105": 4200 }),
    },
  ];

  for (const mat of insulationMaterials) {
    await prisma.insulationMaterial.create({
      data: {
        id: uuidv4(),
        organizationId: orgId,
        ...mat,
        isActive: true,
      },
    });
  }
  console.log(`Created ${insulationMaterials.length} insulation materials`);

  // Window Products (YKK AP)
  const windowTypes = ["awning", "fix", "sliding", "projecting"];

  const windowProducts: Array<{
    productLine: string;
    windowType: string;
    frameMaterial: string;
    glassType: string;
    glassLayers: number;
    spacerType: string | null;
    gasFill: boolean;
    solarType: string;
    sizeCode: string;
    width: number;
    height: number;
    uwValue: number;
    etaG: number;
    listPrice: number;
  }> = [];

  // 1-4: APW 430 (樹脂+トリプルLow-E)
  const apw430Prices = [87600, 76300, 98500, 82700];
  for (let i = 0; i < 4; i++) {
    windowProducts.push({
      productLine: "APW 430",
      windowType: windowTypes[i],
      frameMaterial: "resin",
      glassType: "triple_low_e",
      glassLayers: 3,
      spacerType: "resin",
      gasFill: true,
      solarType: "acquisition",
      sizeCode: "16509",
      width: 1640,
      height: 970,
      uwValue: 1.60,
      etaG: 0.54,
      listPrice: apw430Prices[i],
    });
  }

  // 5-8: APW 330 (樹脂+ダブルLow-E+ガス+樹脂スペーサー)
  const apw330ResinPrices = [34600, 32700, 49300, 36200];
  for (let i = 0; i < 4; i++) {
    windowProducts.push({
      productLine: "APW 330",
      windowType: windowTypes[i],
      frameMaterial: "resin",
      glassType: "double_low_e",
      glassLayers: 2,
      spacerType: "resin",
      gasFill: true,
      solarType: "acquisition",
      sizeCode: "16509",
      width: 1640,
      height: 970,
      uwValue: 1.31,
      etaG: 0.64,
      listPrice: apw330ResinPrices[i],
    });
  }

  // 9-12: APW 330 (樹脂+ダブルLow-E+ガス+アルミスペーサー)
  const apw330AlPrices = [31200, 29500, 44800, 32700];
  for (let i = 0; i < 4; i++) {
    windowProducts.push({
      productLine: "APW 330",
      windowType: windowTypes[i],
      frameMaterial: "resin",
      glassType: "double_low_e",
      glassLayers: 2,
      spacerType: "aluminum",
      gasFill: true,
      solarType: "acquisition",
      sizeCode: "16509",
      width: 1640,
      height: 970,
      uwValue: 1.53,
      etaG: 0.64,
      listPrice: apw330AlPrices[i],
    });
  }

  // 13-16: APW 330 日射遮蔽型
  const apw330ShieldPrices = [36800, 34900, 51500, 38400];
  for (let i = 0; i < 4; i++) {
    windowProducts.push({
      productLine: "APW 330",
      windowType: windowTypes[i],
      frameMaterial: "resin",
      glassType: "double_low_e_shielding",
      glassLayers: 2,
      spacerType: "resin",
      gasFill: true,
      solarType: "shielding",
      sizeCode: "16509",
      width: 1640,
      height: 970,
      uwValue: 1.31,
      etaG: 0.40,
      listPrice: apw330ShieldPrices[i],
    });
  }

  // 17-18: 金属樹脂複合+ダブルLow-E
  const compositePrices = [28500, 26800];
  for (let i = 0; i < 2; i++) {
    windowProducts.push({
      productLine: "エピソードNEO",
      windowType: windowTypes[i],
      frameMaterial: "aluminum_resin",
      glassType: "double_low_e",
      glassLayers: 2,
      spacerType: "aluminum",
      gasFill: false,
      solarType: "acquisition",
      sizeCode: "16509",
      width: 1640,
      height: 970,
      uwValue: 2.33,
      etaG: 0.64,
      listPrice: compositePrices[i],
    });
  }

  // 19-20: アルミ+複層(Low-Eなし)
  const aluminumPrices = [18500, 16200];
  for (let i = 0; i < 2; i++) {
    windowProducts.push({
      productLine: "フレミングJ",
      windowType: windowTypes[i],
      frameMaterial: "aluminum",
      glassType: "double",
      glassLayers: 2,
      spacerType: "aluminum",
      gasFill: false,
      solarType: "acquisition",
      sizeCode: "16509",
      width: 1640,
      height: 970,
      uwValue: 4.07,
      etaG: 0.79,
      listPrice: aluminumPrices[i],
    });
  }

  for (const wp of windowProducts) {
    await prisma.windowProduct.create({
      data: {
        id: uuidv4(),
        organizationId: orgId,
        ...wp,
        manufacturer: "YKK AP",
        isActive: true,
      },
    });
  }
  console.log(`Created ${windowProducts.length} window products`);

  // Door Products
  const doorProducts = [
    {
      name: "高断熱玄関ドア(Low-Eダブル)",
      doorType: "entrance",
      material: "aluminum_resin",
      hasGlass: true,
      glassType: "double_low_e",
      udValue: 1.90,
      listPrice: 350000,
      manufacturer: "YKK AP",
    },
    {
      name: "高断熱玄関ドア(ガラスなし)",
      doorType: "entrance",
      material: "aluminum_resin",
      hasGlass: false,
      glassType: null,
      udValue: 1.60,
      listPrice: 280000,
      manufacturer: "YKK AP",
    },
    {
      name: "断熱玄関ドア(Low-Eダブル)",
      doorType: "entrance",
      material: "aluminum_resin",
      hasGlass: true,
      glassType: "double_low_e",
      udValue: 2.33,
      listPrice: 250000,
      manufacturer: "YKK AP",
    },
    {
      name: "断熱玄関ドア(ガラスなし)",
      doorType: "entrance",
      material: "aluminum_resin",
      hasGlass: false,
      glassType: null,
      udValue: 2.33,
      listPrice: 180000,
      manufacturer: "YKK AP",
    },
    {
      name: "勝手口ドア",
      doorType: "service",
      material: "aluminum_resin",
      hasGlass: true,
      glassType: "double",
      udValue: 2.91,
      listPrice: 120000,
      manufacturer: "YKK AP",
    },
  ];

  for (const dp of doorProducts) {
    await prisma.doorProduct.create({
      data: {
        id: uuidv4(),
        organizationId: orgId,
        ...dp,
        isActive: true,
      },
    });
  }
  console.log(`Created ${doorProducts.length} door products`);

  console.log("Seeding complete!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
