import { db } from '../../../../lib/db';
import { NextResponse } from 'next/server';

import { cookies } from "next/headers";


export async function POST(req) {
  try {
    // const isProd = req.cookies.get('isProd')?.value;
    const isProd = req.cookies.get('isProd')?.value === '1';
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ message: "Authorization header required" }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');
    console.log("Token:", token);
    console.log('isProd:', isProd);
    const body = await req.json();
    const { invoiceNo, sellerNTNCNIC, sellerBusinessName, sellerAddress, userId, customerId, buyerProvince, sellerProvince, sellerProvinceId, scenarioCodeId, saleType, buyerType, fbrInvoiceRefNo, date, items } = body;
    // console.log(JSON.stringify({
    //   invoiceNo, userId, customerId, date,
    //   buyerProvince, sellerProvince, sellerProvinceId, scenarioCodeId,
    //   saleType, buyerType, fbrInvoiceRefNo,
    //   sellerNTNCNIC, sellerBusinessName, sellerAddress,
    //   items
    // }, null, 2));
    if (!invoiceNo || !userId || !customerId || !date || !buyerProvince || !sellerProvince || !sellerProvinceId || !scenarioCodeId || !buyerType || !saleType || !items) {
      console.log("fields:", invoiceNo, userId, customerId, buyerProvince, sellerProvince, sellerProvinceId, scenarioCodeId, saleType, buyerType, fbrInvoiceRefNo, date, items, sellerNTNCNIC, sellerBusinessName, sellerAddress);
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    console.log("Creating invoice with data:", buyerType, typeof buyerType);
    const FBR_VALIDATE_URL = isProd
      ? process.env.VALIDATE_TO_FBR_PRODUCTION
      : process.env.VALIDATE_TO_FBR_SANDBOX;
    const [buyerInfoRows] = await db.query(
      `SELECT 
     cnic_inc AS buyerNTNCNIC, 
     business_name AS buyerBusinessName, 
     address AS buyerAddress, 
     province AS buyerProvince 
   FROM customers 
   WHERE id = ?`,
      [customerId]
    );

    const buyerInfo = buyerInfoRows[0];
    console.log("Buyer Info:", buyerInfo);

    const [scenarioCodeRow] = await db.query(
      `SELECT 
     code    
   FROM scenario_codes 
   WHERE id = ?`,
      [scenarioCodeId]
    );
    const scenarioCode = scenarioCodeRow[0];
    console.log("Scenario Code:", scenarioCode.code);

    const fbrPayload = {
      invoiceType: saleType,
      invoiceDate: date,
      sellerNTNCNIC: sellerNTNCNIC,
      sellerBusinessName: sellerBusinessName,
      sellerProvince: sellerProvince,
      sellerAddress: sellerAddress,
      buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
      buyerBusinessName: buyerInfo.buyerBusinessName,
      buyerProvince: buyerInfo.buyerProvince,
      buyerAddress: buyerInfo.buyerAddress,
      buyerRegistrationType: buyerType,
      invoiceRefNo: fbrInvoiceRefNo || "",

      ...(!isProd && { scenarioId: scenarioCode.code }),

      items: items.map(item => ({
        hsCode: item.hsCode,
        productDescription: item.description,
        rate: item.rateDesc,
        uoM: item.unit,
        quantity: Number(item.qty),
        totalValues: Number(item.totalValues || item.valueInclTax || 0),
        valueSalesExcludingST: Number(item.valueSalesExcludingST),
        fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
        salesTaxApplicable: Number(item.salesTaxApplicable || 0),
        salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
        extraTax: Number(item.extraTax || 0),
        furtherTax: Number(item.furtherTax || 0),
        sroScheduleNo: item.sroScheduleNo || "",
        fedPayable: Number(item.fedPayable || 0),
        discount: Number(item.discount || 0),
        saleType: item.TransactionType || "",
        sroItemSerialNo: item.sroItemSerialNo || ""
      }))
    };

    // console.log("FBR Validation Payload:", fbrPayload);
    // const fbrResponse = await fetch(FBR_VALIDATE_URL, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    //   body: JSON.stringify(fbrPayload),
    // });

    // const fbrResult = await fbrResponse.json();

    // console.log("FBR Validation Response:", JSON.stringify(fbrResult, null, 2));
    // const status = fbrResult.validationResponse.status;
    // console.log("FBR Validation Status:", status, typeof status);
    // if (status !== "Valid") {
    //   return NextResponse.json({
    //     message: "FBR validation failed",
    //     fbrResponse: fbrResult
    //   }, { status: 400 });
    // }
    let result;

    if (isProd) {
      console.log("Inserting into invoices_prod");
      [result] = await db.query(
        `INSERT INTO invoices_prod (invoice_no, user_id, invoice_date, customer_id, buyerProvince, sellerProvince, sellerProvinceId, scenario_code,saleType, buyerType,fbrInvoiceRefNo, items)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceNo,
          userId,
          date,
          customerId,
          buyerProvince,
          sellerProvince,
          sellerProvinceId,
          scenarioCodeId,
          saleType,
          buyerType,
          fbrInvoiceRefNo,
          JSON.stringify(items),
        ]
      );
    } else {
      [result] = await db.query(
        `INSERT INTO invoices (invoice_no, user_id, invoice_date, customer_id, buyerProvince, sellerProvince, sellerProvinceId, scenario_code,saleType, buyerType,fbrInvoiceRefNo, items)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceNo,
          userId,
          date,
          customerId,
          buyerProvince,
          sellerProvince,
          sellerProvinceId,
          scenarioCodeId,
          saleType,
          buyerType,
          fbrInvoiceRefNo,
          JSON.stringify(items),
        ]
      );
    }


    return NextResponse.json({
      message: "Invoice saved successfully",
      invoiceId: result.insertId
    }, { status: 201 });
  } catch (error) {
    console.warn("Error creating invoice:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const isProd = req.cookies.get('isProd')?.value;

    console.log('isProd:', isProd);

    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 10;
    const userId = parseInt(searchParams.get('userId'));
    console.log('userId:', userId);
    if (page < 1 || pageSize < 1) {
      return NextResponse.json(
        { message: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }
    let rows;
    if (isProd === '1' || isProd === 'true') {
      console.log('Running in Production mode');
      [rows] = await db.query(
        `CALL get_invoices_by_status_order_paginated_prod(?, ?, ?)`,
        [page, pageSize, userId]
      );
    } else {
      console.log('Running in Development mode');
      [rows] = await db.query(
        `CALL get_invoices_by_status_order_paginated(?, ?, ?)`,
        [page, pageSize, userId]
      );

    }
    const invoices = rows[0];

    return NextResponse.json(
      {
        data: invoices,
        page,
        pageSize,
        count: invoices.length
      },
      { status: 200 }
    );


  } catch (error) {
    console.warn('Error fetching invoices:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const isProd = req.cookies.get('isProd')?.value === '1';
    //const isProd = req.cookies.get('isProd')?.value;

    console.log('isProd:', isProd, typeof isProd);
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ message: "Authorization header required" }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');
    console.log("Token:", token);
    const body = await req.json();
    const { invoiceId, invoiceNo, sellerNTNCNIC, sellerBusinessName, sellerAddress, date, customerId, buyerProvince, sellerProvince, sellerProvinceId, scenarioCode, scenarioCodeId, saleType, buyerType, fbrInvoiceRefNo, items, status, toValidate } = body;
    console.log(JSON.stringify({
      toValidate,
      invoiceId,
      invoiceNo,
      sellerNTNCNIC,
      sellerBusinessName,
      sellerAddress,
      date,
      customerId,
      buyerProvince,
      sellerProvince,
      sellerProvinceId,
      scenarioCode,
      saleType,
      buyerType,
      fbrInvoiceRefNo,
      items,
      status
    }, null, 2));

    if (!invoiceId) {
      return NextResponse.json({ message: 'invoiceId is required' }, { status: 400 });
    }
    const FBR_VALIDATE_URL = isProd
      ? process.env.VALIDATE_TO_FBR_PRODUCTION
      : process.env.VALIDATE_TO_FBR_SANDBOX;
    const [buyerInfoRows] = await db.query(
      `SELECT 
     cnic_inc AS buyerNTNCNIC, 
     business_name AS buyerBusinessName, 
     address AS buyerAddress, 
     province AS buyerProvince 
   FROM customers 
   WHERE id = ?`,
      [customerId]
    );

    const buyerInfo = buyerInfoRows[0];
    console.log("Buyer Info:", buyerInfo);

    const [sellerInfoRows] = await db.query(
      `SELECT 
     id as userId
   FROM users 
   WHERE cnic_ntn = ?`,
      [sellerNTNCNIC]
    );

    const sellerInfo = sellerInfoRows[0];
    console.log("Seller Info:", sellerInfo);
    //   const [scenarioCodeRow] = awaitse db.query(
    //     `SELECT 
    //    code    
    //  FROM scenario_codes 
    //  WHERE id = ?`,
    //     [scenarioCodeId]
    //   );
    //   const scenarioCode = scenarioCodeRow[0];
    //   console.log("Scenario Code:", scenarioCode.code);

    const fbrPayload = (() => {
      switch (scenarioCode) {
        case "SN001":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              // extraTax: Number(item.extraTax || ""),
              extraTax: Number(item.extraTax) > 0 ? Number(item.extraTax) : "",
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN002":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
               // extraTax: Number(item.extraTax || ""),
              extraTax: Number(item.extraTax) > 0 ? Number(item.extraTax) : "",
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN003":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN004":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN005":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
               // extraTax: Number(item.extraTax || ""),
              extraTax: Number(item.extraTax) > 0 ? Number(item.extraTax) : "",
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN006":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
               // extraTax: Number(item.extraTax || ""),
              extraTax: Number(item.extraTax) > 0 ? Number(item.extraTax) : "",
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN007":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN008":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN009":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN010":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN011":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            dataSource: "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN012":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN013":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN014":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN015":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            additional1: "",
            additional2: "",
            additional3: "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN016":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN017":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN018":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN019":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN020":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN021":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN022":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN023":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN024":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN025":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
               // extraTax: Number(item.extraTax || ""),
              extraTax: Number(item.extraTax) > 0 ? Number(item.extraTax) : "",
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN026":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN027":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              extraTax: Number(item.extraTax || 0),
              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
        case "SN028":
          return {
            invoiceType: saleType,
            invoiceDate: date,
            sellerNTNCNIC: sellerNTNCNIC,
            sellerBusinessName: sellerBusinessName,
            sellerProvince: sellerProvince,
            sellerAddress: sellerAddress,
            buyerNTNCNIC: buyerInfo.buyerNTNCNIC,
            buyerBusinessName: buyerInfo.buyerBusinessName,
            buyerProvince: buyerInfo.buyerProvince,
            buyerAddress: buyerInfo.buyerAddress,
            buyerRegistrationType: buyerType,
            invoiceRefNo: fbrInvoiceRefNo || "",
            ...(!isProd && { scenarioId: scenarioCode }),
            items: items.map(item => ({
              hsCode: item.hsCode,
              productDescription: item.description,
              rate: item.rateDesc,
              uoM: item.unit,
              quantity: Number(item.qty),
              totalValues: Number(item.totalValues || item.valueInclTax || 0),
              valueSalesExcludingST: Number(item.valueSalesExcludingST),
              fixedNotifiedValueOrRetailPrice: Number(item.fixedNotifiedValueOrRetailPrice || 0),
              salesTaxApplicable: Number(item.salesTaxApplicable || 0),
              salesTaxWithheldAtSource: Number(item.salesTaxWithheldAtSource || 0),
              // extraTax: Number(item.extraTax || ""),
              extraTax: Number(item.extraTax) > 0 ? Number(item.extraTax) : "",

              furtherTax: Number(item.furtherTax || 0),
              sroScheduleNo: item.sroScheduleNo || "",
              fedPayable: Number(item.fedPayable || 0),
              discount: Number(item.discount || 0),
              saleType: item.TransactionType || "",
              sroItemSerialNo: item.sroItemSerialNo || ""
            }))
          };
      }
    })();

    if (toValidate) {
      console.log("FBR Validation Payload:", fbrPayload);
      const fbrResponse = await fetch(FBR_VALIDATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(fbrPayload),
      });
      if (fbrResponse.status === 503 || fbrResponse.status === 504) {
        return NextResponse.json({
          message: "FBR Service is currently unavailable. Status reset to Pending.",
          success: false
        }, { status: 503 });
      }
      // const rawText = await fbrResponse.text();
      // const fbrResult = await fbrResponse.json();
      // const rawText = await fbrResponse.text();

      let fbrResult;
      try {
        // fbrResult = JSON.parse(rawText);
        fbrResult = await fbrResponse.json();
      } catch (e) {
        console.error("FBR returned non-JSON:", fbrResult);

        return NextResponse.json({
          message: "Invalid response from FBR",
          rawResponse: rawText
        }, { status: 502 });
      }


      console.log("FBR Validation Response:", JSON.stringify(fbrResult, null, 2));
      const fbrstatus = fbrResult.validationResponse.status;
      console.log("FBR Validation Status:", fbrstatus, typeof fbrstatus);
      if (fbrstatus !== "Valid") {
        if (isProd) {
          await db.query(
            `UPDATE invoices_prod SET status = 'Failed' WHERE id = ?`,
            [invoiceId]
          );
        } else {
          await db.query(
            `UPDATE invoices SET status = 'Failed' WHERE id = ?`,
            [invoiceId]
          );
        }
        let errorData = [];

        if (fbrResult.validationResponse.invoiceStatuses && fbrResult.validationResponse.invoiceStatuses.length > 0) {
          errorData = fbrResult.validationResponse.invoiceStatuses;
        } else {
          errorData = [{
            itemSNo: "0",
            statusCode: fbrResult.validationResponse.statusCode,
            status: fbrResult.validationResponse.status,
            errorCode: fbrResult.validationResponse.errorCode,
            error: fbrResult.validationResponse.error
          }];
        }
        await db.query(
          `INSERT INTO invoices_error (userid, invoiceid, error) 
   VALUES (?, ?, ?) 
   ON DUPLICATE KEY UPDATE error = VALUES(error)`,
          [sellerInfo.userId, invoiceId, JSON.stringify(errorData)]
        );
        return NextResponse.json({
          message: "FBR validation failed, See Error Logs",
          fbrResponse: fbrResult
        }, { status: 400 });
      } else {
        if (isProd) {
          await db.query(
            `UPDATE invoices_prod SET status = 'Validated' WHERE id = ?`,
            [invoiceId]
          );
        } else {
          await db.query(
            `UPDATE invoices SET status = 'Validated' WHERE id = ?`,
            [invoiceId]
          );
        }
        return NextResponse.json({ message: "Invoice validated successfully", }, { status: 200 })
      }

    }
    // Build the update depending on provided fields
    const updates = [];
    const params = [];

    if (typeof invoiceNo !== 'undefined') { updates.push('invoice_no = ?'); params.push(invoiceNo); }
    if (typeof date !== 'undefined') { updates.push('invoice_date = ?'); params.push(date); }
    if (typeof customerId !== 'undefined') { updates.push('customer_id = ?'); params.push(customerId); }
    if (typeof buyerProvince !== 'undefined') { updates.push('buyerProvince = ?'); params.push(buyerProvince); }
    if (typeof sellerProvinceId !== 'undefined') { updates.push('sellerProvinceId = ?'); params.push(sellerProvinceId); }
    if (typeof sellerProvince !== 'undefined') { updates.push('sellerProvince = ?'); params.push(sellerProvince); }
    if (typeof scenarioCodeId !== 'undefined') { updates.push('scenario_code = ?'); params.push(scenarioCodeId); }
    if (typeof saleType !== 'undefined') { updates.push('saleType = ?'); params.push(saleType); }
    if (typeof buyerType !== 'undefined') { updates.push('buyerType = ?'); params.push(buyerType); }
    if (typeof fbrInvoiceRefNo !== 'undefined') { updates.push('fbrInvoiceRefNo = ?'); params.push(fbrInvoiceRefNo); }
    if (typeof items !== 'undefined') { updates.push('items = ?'); params.push(JSON.stringify(items)); }
    if (typeof status !== 'undefined') { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }
    let sql;
    if (isProd === '1' || isProd == 'true') {
      sql = `UPDATE invoices_prod SET ${updates.join(', ')} WHERE id = ?`;
    } else {
      sql = `UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`;
    }

    params.push(invoiceId);

    if (!toValidate) {
      await db.query(sql, params);
      if (isProd) {
        await db.query(
          `UPDATE invoices_prod SET status = 'Pending' WHERE id = ?`,
          [invoiceId]
        );
      } else {
        await db.query(
          `UPDATE invoices SET status = 'Pending' WHERE id = ?`,
          [invoiceId]
        );
      }
      return NextResponse.json({ message: "Invoice  saved successfully", }, { status: 200 })
    }

    ;
  } catch (error) {
    console.warn('Error updating invoice:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}


export async function DELETE(req) {
  const connection = await db.getConnection();

  try {
    const isProd = req.cookies.get('isProd')?.value;

    console.log('isProd:', isProd);

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoiceId");

    if (!invoiceId) {
      return NextResponse.json(
        { message: "invoiceId is required" },
        { status: 400 }
      );
    }

    await connection.beginTransaction();
    let rows;
    if (isProd === '1' || isProd === 'true') {
      [rows] = await connection.query(
        `SELECT invoice_no, status, user_id 
       FROM invoices_prod 
       WHERE id = ? 
       FOR UPDATE`,
        [invoiceId]
      );
    } else {
      [rows] = await connection.query(
        `SELECT invoice_no, status, user_id 
       FROM invoices 
       WHERE id = ? 
       FOR UPDATE`,
        [invoiceId]
      );
    }


    if (rows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { message: "Invoice not found" },
        { status: 404 }
      );
    }

    const { invoice_no, status, user_id } = rows[0];

    if (status === "Success") {
      await connection.rollback();
      return NextResponse.json(
        { message: "Success invoice cannot be deleted" },
        { status: 403 }
      );
    }

    if (isProd === '1' || isProd === 'true') {
      await connection.query(
        `DELETE FROM invoices_prod WHERE id = ?`,
        [invoiceId]
      );

      await connection.query(
        `UPDATE invoices_prod
       SET invoice_no = invoice_no - 1
       WHERE user_id = ?
         AND invoice_no > ?`,
        [user_id, invoice_no]
      );

      await connection.commit();
    } else {
      await connection.query(
        `DELETE FROM invoices WHERE id = ?`,
        [invoiceId]
      );

      await connection.query(
        `UPDATE invoices
       SET invoice_no = invoice_no - 1
       WHERE user_id = ?
         AND invoice_no > ?`,
        [user_id, invoice_no]
      );

      await connection.commit();
    }

    return NextResponse.json(
      { message: "Invoice deleted and invoice numbers rearranged" },
      { status: 200 }
    );
  } catch (error) {
    await connection.rollback();
    console.warn("Error deleting invoice:", error);

    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}