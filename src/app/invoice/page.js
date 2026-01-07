'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import { DocumentArrowDownIcon, CloudArrowDownIcon } from '@heroicons/react/24/solid';

export default function InvoicePage({ darkMode }) {
    const [showForm, setShowForm] = useState(false);
    const [hsCodes, setHsCodes] = useState([]);
    const [uomList, setUomList] = useState([]);
    const [saleTypeList, setSaleTypeList] = useState([]);
    const [transTypeList, setTransTypeList] = useState([]);
    const [latestInvoice, setLatestInvoice] = useState(null);
    const [scenarioCodes, setScenarioCodes] = useState([]);
    const [scenarioSearch, setScenarioSearch] = useState('');
    const [customers, setCustomers] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [provinces, setProvinces] = useState([]);
    const [invoiceForm, setInvoiceForm] = useState({
        invoiceNo: '',
        date: '',
        customer: '',
        customerId: 0,
        buyerProvince: '',
        sellerProvinceId: 0,
        sellerProvince: '',
        scenarioCode: '',
        scenarioCodeId: 0,
        saleType: '',
        buyerType: '',
        registrationNo: '',
        fbrInvoiceRefNo: '',
        exclTax: 0,
        tax: 0,
        inclTax: 0,
        items: [{
            hsCode: '',
            description: '',
            qty: '',
            rateId: 0,
            rate: '',
            rateDesc: '',
            unit: '',
            singleUnitPrice: '',
            totalValues: '',
            valueSalesExcludingST: '',
            fixedNotifiedValueOrRetailPrice: '',
            salesTaxApplicable: '',
            salesTaxWithheldAtSource: '',
            extraTax: '',
            furtherTax: '',
            sroScheduleNo: '',
            fedPayable: '',
            discount: '',
            TransactionTypeId: 0,
            TransactionType: '',
            sroItemSerialNo: '',
        }]
    });
    const [invoices, setInvoices] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);

    const [isEditMode, setIsEditMode] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [editingInvoiceId, setEditingInvoiceId] = useState(null);

    const [processingInvoiceId, setProcessingInvoiceId] = useState(null);


    const emptyRow = {
        hsCode: "",
        description: "",
        qty: "",
        rateId: 0,
        rate: "",
        rateDesc: "",
        unit: "",
        singleUnitPrice: "",
        totalValues: "",
        valueSalesExcludingST: "",
        fixedNotifiedValueOrRetailPrice: "",
        salesTaxApplicable: "",
        salesTaxWithheldAtSource: "",
        extraTax: "",
        furtherTax: "",
        sroScheduleNo: "",
        sroScheduleId: "",
        sroOptions: [],
        sroItemOptions: [],
        sroItemSerialNo: "",
        sroItemId: "",
        fedPayable: "",
        discount: "",
        TransactionTypeId: 0,
        TransactionType: "",
    };

    // generate short unique id for each row to avoid index-shift races in async callbacks
    const genRowId = () => `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const getFbrHeaders = () => {
        const token = sessionStorage.getItem("sellerToken");
        return token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" };
    };

    // const [rows, setRows] = useState([
    //     {"},{
    //         invoiceNo: '',
    //         date: '',
    //         customerType: 'Individual',
    //         customerName: '',
    //         customerCnicNtn: '',
    //         scenarioCode: '',
    //         fbrInvNo: '',
    //         amount: '',
    //         salesTax: '',
    //         total: '',
    //     },
    // ]);
    const [rows, setRows] = useState([{ ...emptyRow, rowId: genRowId() }]);

    const setRowFieldsById = (rowId, changes) => {
        setRows(prev => prev.map(r => (r.rowId === rowId ? { ...r, ...changes } : r)));
    };

    useEffect(() => {
        async function fetchScenarioCodes() {
            try {
                const res = await fetch("/api/scenarioCodes");
                const data = await res.json();
                setScenarioCodes(data.scenarioCodes);
            } catch (err) {
                console.warn("Failed to fetch scenario codes:", err);
            }
        }

        async function fetchCustomers() {
            try {
                const userId = sessionStorage.getItem("userId");
                const res = await fetch(`/api/customer?userId=${userId}`);
                const data = await res.json();
                setCustomers(data);
            } catch (err) {
                console.warn("Failed to fetch customers:", err);
            }
        }
        // console.log("hs code ", hsCodes);
        // console.log("uom list ", uomList);
        fetchScenarioCodes();
        fetchCustomers();
    }, []);


    useEffect(() => {
        if (showForm && !isEditMode) {
            const fetchLatestInvoice = async () => {
                try {
                    const userId = sessionStorage.getItem("userId");
                    if (!userId) return;

                    const res = await fetch(`/api/latestInvoiceNo?user_id=${userId}`);
                    const data = await res.json();
                    setLatestInvoice(data.latestInvoice);

                    setInvoiceForm((prev) => ({
                        ...prev,
                        invoiceNo: data.latestInvoice,
                    }));
                } catch (err) {
                    console.warn("Failed to fetch latest invoice:", err);
                    setLatestInvoice(1);
                    setInvoiceForm((prev) => ({ ...prev, invoiceNo: 1 }));
                }
            };

            fetchLatestInvoice();
        }
        if (showForm) {
            const fetchMasterData = async () => {
                try {
                    // const token = process.env.NEXT_PUBLIC_FBR_BEARER_TOKEN;

                    // if (!token) {
                    //     throw new Error("Missing NEXT_PUBLIC_FBR_BEARER_TOKEN in .env.local");
                    // }

                    // const headers = {
                    //     Authorization: `Bearer ${token}`,
                    //     Accept: "application/json",
                    // };

                    const headers = getFbrHeaders();
                    const [hsResponse, uomResponse, transTypeResponse, saleTypeResponse] = await Promise.all([
                        fetch("/api/fbr/hsCode", { headers }),
                        fetch("/api/fbr/uom", { headers }),
                        fetch("/api/fbr/TransactionType", { headers }),
                        fetch("/api/fbr/saleType", { headers }),
                    ]);

                    if (!hsResponse.ok) {
                        throw new Error(`HS codes API failed: ${hsResponse.status}`);
                    }
                    if (!uomResponse.ok) {
                        throw new Error(`UOM API failed: ${uomResponse.status}`);
                    }
                    if (!transTypeResponse.ok) {
                        throw new Error(`Transaction Type API failed: ${transTypeResponse.status}`);
                    }
                    if (!saleTypeResponse.ok) {
                        throw new Error(`Sale Type API failed: ${saleTypeResponse.status}`);
                    }

                    const hsData = await hsResponse.json();
                    const uomData = await uomResponse.json();
                    const transTypeData = await transTypeResponse.json();
                    const saleTypeData = await saleTypeResponse.json();
                    console.log("BEFORE HS codes and UOM data", uomData);
                    setHsCodes(Array.isArray(hsData) ? hsData : []);
                    setUomList(Array.isArray(uomData) ? uomData : []);
                    setTransTypeList(Array.isArray(transTypeData) ? transTypeData : []);
                    setSaleTypeList(Array.isArray(saleTypeData) ? saleTypeData : []);

                    //    console.log("AFTER HS codes and transTypeData data", transTypeData);
                    //    console.log("AFTER HS codes and saleTypeData data", saleTypeData);


                } catch (err) {
                    console.warn("Failed to load HS codes or UOM:", err);
                    setHsCodes([]);
                    setUomList([]);
                    setTransTypeList([]);
                }
            };

            fetchMasterData();
        }
         // console.log("min date from use Effect of master data");
        //getMinDate();
    }, [showForm, isEditMode]);

    useEffect(() => {
        fetchInvoices();
    }, [page]);

    const fetchInvoices = async () => {
        setLoading(true);
        const userId = Number(sessionStorage.getItem('userId'));
        //console.log('userId in fetchInvoices:', userId);
        // console.log('type of ', typeof userId);
        try {
            const res = await fetch(
                `/api/invoices-crud?page=${page}&pageSize=${pageSize}&userId=${userId}`
            );
            const data = await res.json();
            console.log('Fetched invoices data:', data);
            setInvoices(data.data || []);
        } catch (err) {
            console.warn('Failed to load invoices', err);
        } finally {
            setLoading(false);
        }
    };

    // useEffect(() => {
    //     const fetchProvinces = async () => {
    //         try {
    //             setLoading(true);

    //             const token = process.env.NEXT_PUBLIC_FBR_BEARER_TOKEN;

    //             if (!token) {
    //                 throw new Error("API Bearer token is missing in environment variables");
    //             }

    //             const response = await fetch('https://gw.fbr.gov.pk/pdi/v1/provinces', {
    //                 method: 'GET',
    //                 headers: {
    //                     'Authorization': `Bearer ${token}`,
    //                     'Accept': 'application/json',
    //                 },
    //             });

    //             if (!response.ok) {
    //                 if (response.status === 401) {
    //                     throw new Error("Unauthorized – invalid or expired token");
    //                 }
    //                 if (response.status === 403) {
    //                     throw new Error("Forbidden – you don't have permission");
    //                 }
    //                 throw new Error(`API error: ${response.status} ${response.statusText}`);
    //             }

    //             const data = await response.json();
    //             console.log("Fetched provinces:", data);
    //             setProvinces(Array.isArray(data) ? data : []);

    //         } catch (err) {
    //             console.warn("Failed to fetch provinces:", err);
    //         } finally {
    //             setLoading(false);
    //         }
    //     };

    //     fetchProvinces();
    // }, []);
    useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const res = await fetch("/api/fbr/provinces", { headers: getFbrHeaders() });
                const json = await res.json();
                setProvinces(json.data || []);
            } catch (err) {
                console.warn(err);
            }
        };

        fetchProvinces();
    }, []);

    // Enhanced: accepts optional overrides so we can use a provided row/date/province when in edit mode
    const fetchSalesTaxRate = async (index, provinceOverride, rowOverride, dateOverride) => {
        const date = dateOverride ?? invoiceForm.date; // e.g. "2025-12-25"

        // Prefer explicit TransactionTypeId if available, otherwise try to resolve from description
        let transTypeId = rowOverride?.TransactionTypeId ?? rows[index]?.TransactionTypeId;
        if (!transTypeId) {
            const TransactionTypeDesc = (rowOverride?.TransactionType ?? rows[index]?.TransactionType ?? "").trim();
            if (TransactionTypeDesc) {
                const matchingTransType = transTypeList.find(
                    (item) => item.transactioN_DESC?.trim().toLowerCase() === TransactionTypeDesc.toLowerCase()
                );
                transTypeId = matchingTransType?.transactioN_TYPE_ID;
            }
        }

        // Resolve province: accept either an id/code or a description override
        const provCandidate = provinceOverride ?? invoiceForm.sellerProvinceId ?? invoiceForm.sellerProvince ?? rows[index]?.sellerProvince ?? '';

        let matchingProvince = null;
        const provStr = String(provCandidate ?? '').trim();
        if (provStr) {
            matchingProvince = provinces.find(
                (p) => String(p.stateProvinceCode) === provStr || String(p.id) === provStr || (p.stateProvinceDesc || '').trim().toLowerCase() === provStr.toLowerCase()
            );
        }
        const provinceCode = matchingProvince ? Number(matchingProvince.stateProvinceCode ?? matchingProvince.id ?? 0) : null;

        //console.log("Fetching rate for date:", date, "transTypeId:", transTypeId, "provinceCode:", provinceCode);

        if (!date || !transTypeId || !provinceCode) {
            console.warn("Missing required params for rate fetch", { date, transTypeId, provinceCode });
            //   handleInputChange(index, "rate", ""); // clear or fallback
            return;
        }

        const formattedDate = new Date(date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).replace(/ /g, "-"); // → "25-Dec-2025"

        try {
            const apiUrl = `/api/fbr/rate?date=${date}&transTypeId=${transTypeId}&provinceCode=${provinceCode}`;
            const response = await fetch(apiUrl, { headers: getFbrHeaders() });

            if (!response.ok) {
                throw new Error(`Sales tax API error: ${response.status}`);
            }

            const json = await response.json();
            const rates = Array.isArray(json.data) ? json.data : [];
            //   console.log("fetched Rate options", rates);

            if (rates.length === 0) {
                handleInputChange(index, "rateOptions", []);
                // don't overwrite explicit values if user already set them
                if (!rowOverride?.rate && !rows[index]?.rate) handleInputChange(index, "rate", "");
                if (!rowOverride?.rateId && !rows[index]?.rateId) handleInputChange(index, "rateId", 0);
                if (!rowOverride?.rateDesc && !rows[index]?.rateDesc) handleInputChange(index, "rateDesc", "");
            } else if (rates.length === 1) {
                const r = rates[0];
                const displayVal = r.ratE_VALUE ?? r.ratE_ID ?? r.ratE_DESC ?? "";
                handleInputChange(index, "rateOptions", rates);

                // Only update rate fields if they differ from existing values to avoid clearing dependent SROs unnecessarily
                const existingRateId = rowOverride?.rateId ?? rows[index]?.rateId ?? 0;
                const existingRateVal = rowOverride?.rate ?? rows[index]?.rate ?? '';
                if (Number(existingRateId) !== Number(r.ratE_ID) && String(existingRateVal) !== String(displayVal)) {
                    handleInputChange(index, "rate", String(displayVal));
                    handleInputChange(index, "rateId", r.ratE_ID ?? 0);
                    handleInputChange(index, "rateDesc", r.ratE_DESC ?? "");

                    // After we set the rate value, attempt to fetch SROs for this row
                    setTimeout(() => fetchSroScheduleOptions(index, { ...(rowOverride ?? rows[index]), rateId: r.ratE_ID }, date, provinceCode), 0);
                }
            } else {
                handleInputChange(index, "rateOptions", rates);

                // If the row already has a stored rateId or rate, try to preserve that
                const existingRateId = rowOverride?.rateId ?? rows[index]?.rateId;
                const existingRateVal = rowOverride?.rate ?? rows[index]?.rate;

                const matched = rates.find(o => String(o.ratE_ID) === String(existingRateId) || String(o.ratE_VALUE) === String(existingRateVal) || String(o.ratE_DESC) === String(existingRateVal));
                if (matched) {
                    // Only update if the matched value differs from what we have
                    if (String(rows[index]?.rate) !== String(matched.ratE_VALUE ?? matched.ratE_ID ?? matched.ratE_DESC) || Number(rows[index]?.rateId || 0) !== Number(matched.ratE_ID || 0)) {
                        handleInputChange(index, "rate", String(matched.ratE_VALUE ?? matched.ratE_ID ?? matched.ratE_DESC));
                        handleInputChange(index, "rateId", matched.ratE_ID ?? 0);
                        handleInputChange(index, "rateDesc", matched.ratE_DESC ?? "");

                        setTimeout(() => fetchSroScheduleOptions(index, { ...(rowOverride ?? rows[index]), rateId: matched.ratE_ID }, date, provinceCode), 0);
                    }
                } else {
                    // leave existing values untouched
                }
            }
        } catch (err) {
            console.warn("Failed to fetch rate:", err);
            // handleInputChange(index, "rateOptions", []);
            // handleInputChange(index, "rate", "");
            // handleInputChange(index, "rateId", 0);
            // handleInputChange(index, "rateDesc", "");
        }
    };

    useEffect(() => {
        // Re-fetch rates for all rows when date or seller province id changes
        // NOTE: intentionally do NOT depend on rows.length so adding a new row doesn't trigger re-fetch for existing rows.
        if (!invoiceForm.date || !invoiceForm.sellerProvinceId) {
            console.log("Date or seller province id missing, skipping rate fetch", invoiceForm.date, invoiceForm.sellerProvinceId);
            return;
        }
        rows.forEach((r, idx) => {
            if (r && (r.TransactionTypeId || r.TransactionType)) fetchSalesTaxRate(idx);
        });
    }, [invoiceForm.date, invoiceForm.sellerProvinceId]);

    // Enhanced SRO fetch: prefers explicit rateId and sellerProvinceId when available
    const fetchSroScheduleOptions = async (index, rowOverride, dateOverride, provinceOverride) => {
        const date = dateOverride ?? invoiceForm.date;

        // prefer passing explicit rateId, otherwise resolve from rate / rateOptions
        let rateId = rowOverride?.rateId ?? rows[index]?.rateId ?? null;
        const optsLocal = rowOverride?.rateOptions ?? rows[index]?.rateOptions ?? [];

        // If we don't have an explicit ratE_ID, try to resolve from displayed rate value or options
        if ((!rateId || rateId === 0) && optsLocal.length > 0) {
            const rateVal = rowOverride?.rate ?? rows[index]?.rate ?? '';
            const match = optsLocal.find(o => String(o.ratE_VALUE) === String(rateVal) || String(o.ratE_DESC) === String(rateVal) || String(o.ratE_ID) === String(rateVal));
            if (match) rateId = match.ratE_ID;
        }

        // Resolve province code using override (which may be id/code or description) or invoiceForm.sellerProvinceId
        const provCandidate = provinceOverride ?? invoiceForm.sellerProvinceId ?? invoiceForm.sellerProvince ?? rows[index]?.sellerProvince ?? '';
        const provStr = String(provCandidate ?? '').trim();
        const matchingProvince = provinces.find(
            (p) => String(p.stateProvinceCode) === provStr || String(p.id) === provStr || (p.stateProvinceDesc || '').trim().toLowerCase() === provStr.toLowerCase()
        );
        const provinceCode = matchingProvince ? Number(matchingProvince.stateProvinceCode ?? matchingProvince.id ?? 0) : null;

        //console.log("Fetching SRO for date:", date, "resolved rateId:", rateId, "provinceCode:", provinceCode);

        if (!date || (!rateId && rateId !== 0) || !provinceCode) {
            console.warn('Missing required params for SRO fetch', { date, rateId, provinceCode });
            //handleInputChange(index, 'sroOptions', []);
            return;
        }

        try {
            const apiUrl = `/api/fbr/sroScheduleNo?rateId=${rateId}&date=${date}&provinceCode=${provinceCode}`;
            const response = await fetch(apiUrl, { headers: getFbrHeaders() });
            if (!response.ok) throw new Error(`SRO API error: ${response.status}`);

            const json = await response.json();
            const opts = Array.isArray(json.data) ? json.data : [];

            handleInputChange(index, 'sroOptions', opts);

            if (opts.length === 0) {
                handleInputChange(index, "sroOptions", []);
                handleInputChange(index, "sroScheduleNo", "");
                handleInputChange(index, "sroScheduleId", '');
                handleInputChange(index, "sroItemOptions", []);
                handleInputChange(index, "sroItemId", '');
                handleInputChange(index, "sroItemSerialNo", "");
            } else if (opts.length === 1) {
                const o = opts[0];
                const val = o.sroScheduleNo ?? o.sro_id ?? o.id ?? o.srO_ID ?? o.code ?? JSON.stringify(o);
                const idVal = o.sro_id ?? o.srO_ID ?? o.sroScheduleId ?? o.id ?? null;
                handleInputChange(index, "sroOptions", opts);
                handleInputChange(index, 'sroScheduleNo', String(val));
                handleInputChange(index, 'sroScheduleId', String(idVal ?? ''));
                handleInputChange(index, 'sroScheduleNoId', String(idVal ?? ''));

                // fetch SRO items for this schedule
                setTimeout(() => fetchSroItemOptions(index, { ...(rowOverride ?? rows[index]), sroScheduleId: String(idVal ?? '') }, date), 0);
            } else {
                const existingSro = rowOverride?.sroScheduleId ?? rowOverride?.sroScheduleNo ?? rows[index]?.sroScheduleId ?? rows[index]?.sroScheduleNo;
                if (existingSro) {
                    // try to match by id or value
                    const found = opts.find(o => String(o.sro_id ?? o.srO_ID ?? o.id) === String(existingSro) || String(o.sroScheduleNo ?? o.sro_id ?? o.id) === String(existingSro));
                    if (found) {
                        const idVal = found.sro_id ?? found.srO_ID ?? found.id ?? null;
                        const val = found.sroScheduleNo ?? found.sro_id ?? found.id ?? found.code ?? JSON.stringify(found);
                        handleInputChange(index, 'sroScheduleNo', String(val));
                        handleInputChange(index, 'sroScheduleId', String(idVal ?? ''));
                        handleInputChange(index, 'sroScheduleNoId', String(idVal ?? ''));

                        // fetch items for the matched schedule
                        setTimeout(() => fetchSroItemOptions(index, { ...(rowOverride ?? rows[index]), sroScheduleId: String(idVal ?? '') }, date), 0);
                    } else {
                        // handleInputChange(index, "sroScheduleNo", "");
                        // handleInputChange(index, "sroScheduleId", '');
                        // handleInputChange(index, "sroItemOptions", []);
                        // handleInputChange(index, "sroItemId", '');
                    }
                } else {
                    // handleInputChange(index, "sroScheduleNo", "");
                    // handleInputChange(index, "sroScheduleId", '');
                    // handleInputChange(index, "sroItemOptions", []);
                    // handleInputChange(index, "sroItemId", '');
                }
            }
        } catch (err) {
            console.warn('Failed to fetch SRO options:', err);
            //   handleInputChange(index, 'sroOptions', []);
        }
    };

    // // re-fetch SROs when date or seller province id changes (for rows that have a rateId or rate)
    // useEffect(() => {
    //     if (!invoiceForm.date || !invoiceForm.sellerProvinceId ) return;
    //     rows.forEach((r, idx) => {
    //         if (r && (r.rateId || r.rate)) fetchSroScheduleOptions(idx);
    //         if (r && r.sroScheduleId) fetchSroItemOptions(idx);
    //     });
    // }, [invoiceForm.date, invoiceForm.sellerProvinceId]);

    // fetch SRO item list for a given SRO schedule (used for the SRO Item dropdown)
    const fetchSroItemOptions = async (index, rowOverride, dateOverride) => {
        const date = dateOverride ?? invoiceForm.date;
        const rowId = rowOverride?.rowId ?? rows[index]?.rowId ?? genRowId();
        const sroId = rowOverride?.sroScheduleId ?? rows[index]?.sroScheduleId ?? '';

        if (!date || !sroId) {
            console.warn('Missing date or sroId for SRO items fetch');
            setRowFieldsById(rowId, { sroItemOptions: [], sroItemId: '', sroItemSerialNo: '' });
            return;
        }

        const formattedDate = new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        }).replace(/ /g, '-');

        try {
            const apiUrl = `/api/fbr/sroItem?sroId=${sroId}&date=${date}`;
            const response = await fetch(apiUrl, { headers: getFbrHeaders() });
            if (!response.ok) throw new Error(`SRO Item API error: ${response.status}`);

            const json = await response.json();
            const opts = Array.isArray(json.data) ? json.data : [];

            setRowFieldsById(rowId, { sroItemOptions: opts });

            if (opts.length === 0) {
                setRowFieldsById(rowId, { sroItemOptions: [], sroItemId: '', sroItemSerialNo: '' });
            } else if (opts.length === 1) {
                const o = opts[0];
                const idVal = o.srO_ITEM_ID ?? o.id ?? null;
                const serial = o.srO_ITEM_DESC ?? String(o);
                setRowFieldsById(rowId, { sroItemOptions: opts, sroItemId: String(idVal), sroItemSerialNo: String(serial) });
            } else {
                const existing = rowOverride?.sroItemId ?? rows[index]?.sroItemId ?? rows[index]?.sroItemSerialNo;
                const found = opts.find(o => String(o.srO_ITEM_ID ?? o.id) === String(existing) || String(o.srO_ITEM_DESC) === String(existing));
                if (found) {
                    const idVal = found.srO_ITEM_ID ?? found.id;
                    setRowFieldsById(rowId, { sroItemId: String(idVal), sroItemSerialNo: found.srO_ITEM_DESC ?? String(found) });
                } else {
                    setRowFieldsById(rowId, { sroItemId: '', sroItemSerialNo: '' });
                }
            }
        } catch (err) {
            console.warn('Failed to fetch SRO items:', err);
            setRowFieldsById(rowId, { sroItemOptions: [] });
        }
    };

    const postInvoiceToFBR = async (invoiceId) => {
        if (!window.confirm("Post this invoice to FBR?")) return;

        setProcessingInvoiceId(invoiceId);

        try {
            const invoice = invoices.find(inv => inv.id === invoiceId);
            if (!invoice) throw new Error("Invoice not found");

            let items = [];
            // let buyerRegistrationType = "unregistered";
            try {
                items = JSON.parse(invoice.items || "[]");
            } catch {
                throw new Error("Invalid invoice items JSON");
            }
            // try {
            //     const regRes = await fetch(`/api/fbr/registrationType?regNo=${invoice.registrationNo}`, {
            //         method: "GET",
            //         cache: "no-store",
            //         headers: {
            //             ...getFbrHeaders(),
            //             "Content-Type": "application/json",
            //         },
            //     });

            //     if (regRes.ok) {
            //         const regData = await regRes.json();

            //         if (regData.statuscode === "00") {
            //             buyerRegistrationType = "Registered";
            //         } else if (regData.statuscode === "01") {
            //             buyerRegistrationType = "unregistered";
            //         } else {
            //             console.warn("Unexpected FBR reg response:", regData);

            //         }
            //     } else {
            //         console.warn(`FBR reg check failed (HTTP ${regRes.status}) for buyer ${invoice.registrationNo}`);
            //     }
            // } catch (regErr) {
            //     console.warn("Buyer registration check failed:", regErr);

            // }
            //const payload = {

            //               invoiceType: invoice.saleType,
            //invoiceDate: new Date(invoice.invoice_date)
            //      .toISOString()
            //        .split("T")[0],
            //      sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
            //        sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
            //          sellerProvince: invoice.sellerProvince,
            //            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
            //              buyerNTNCNIC: invoice.ntn_cnic,
            //                buyerBusinessName: invoice.customer_name,
            // buyerProvince: invoice.buyerProvince,
            //   buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
            //     buyerRegistrationType: invoiceForm.buyerType,
            //       invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
            //         scenarioId: invoice.scenario_code,
            //           items: items.map(item => ({
            //                 hsCode: item.hsCode,
            //                  productDescription: item.description,
            //                 rate: item.rateDesc,
            //                    uoM: item.unit,
            //quantity: Number(item.qty) || 0,
            //totalValues: Number(item.totalValues) || 0,
            //  valueSalesExcludingST: Number(item.valueSalesExcludingST) || 0,
            //    fixedNotifiedValueOrRetailPrice:
            //          Number(item.fixedNotifiedValueOrRetailPrice) || 0,
            //        salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
            //          salesTaxWithheldAtSource:
            //                Number(item.salesTaxWithheldAtSource) || 0,
            //              extraTax: Number(item.extraTax) || "",
            //                furtherTax: Number(item.furtherTax) || 0,
            //                  sroScheduleNo: item.sroScheduleNo || "",
            //                    fedPayable: Number(item.fedPayable) || 0,
            // discount: Number(item.discount) || 0,
            //   saleType: item.TransactionType || "",
            //     sroItemSerialNo: item.sroItemSerialNo || ""
            //   }))
            //};
            console.log("Buyer Type:", invoiceForm.buyerType);
            const payload = (() => {
                switch (invoice.scenario_code) {
                    case "SN001":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || "",
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN002":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || "",
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN003":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN004":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN005":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || "",
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN006":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || "",
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN007":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0,
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN008":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN009":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN010":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN011":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            dataSource: "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN012":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN013":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN014":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN015":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            additional1: "",
                            additional2: "",
                            additional3: "",
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN016":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN017":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN018":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            buyerRegistrationType: invoice.buyerType,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN019":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            buyerRegistrationType: invoice.buyerType,
                            scenarioId: invoice.scenario_code,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN020":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            buyerRegistrationType: invoice.buyerType,
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN021":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            buyerRegistrationType: invoice.buyerType,
                            scenarioId: invoice.scenario_code,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN022":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            buyerRegistrationType: invoice.buyerType,
                            scenarioId: invoice.scenario_code,
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN023":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            buyerRegistrationType: invoice.buyerType,
                            scenarioId: invoice.scenario_code,
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN024":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            buyerRegistrationType: invoice.buyerType,
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN025":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            buyerRegistrationType: invoice.buyerType,
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || "",
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN026":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            buyerRegistrationType: invoice.buyerType,
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN027":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            buyerRegistrationType: invoice.buyerType,
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || 0,
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };
                    case "SN027":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date)
                                .toISOString()
                                .split("T")[0],
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            buyerRegistrationType: invoice.buyerType,
                            scenarioId: invoice.scenario_code,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty),
                                totalValues: Number(item.totalValues),
                                valueSalesExcludingST: Number(item.valueSalesExcludingST),
                                fixedNotifiedValueOrRetailPrice:
                                    Number(item.fixedNotifiedValueOrRetailPrice) || 0.00,
                                salesTaxApplicable: Number(item.salesTaxApplicable) || 0,
                                salesTaxWithheldAtSource:
                                    Number(item.salesTaxWithheldAtSource) || 0,
                                extraTax: Number(item.extraTax) || "",
                                furtherTax: Number(item.furtherTax) || 0,
                                sroScheduleNo: item.sroScheduleNo || "",
                                fedPayable: Number(item.fedPayable) || 0,
                                discount: Number(item.discount) || 0,
                                saleType: item.TransactionType || "",
                                sroItemSerialNo: item.sroItemSerialNo || ""
                            }))
                        };

                    // ================= DEFAULT =================
                    default:
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: new Date(invoice.invoice_date).toISOString().split("T")[0],
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            buyerRegistrationType: invoice.buyerType,
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            scenarioId: invoice.scenario_code,
                            items: items.map(item => ({
                                hsCode: item.hsCode,
                                productDescription: item.description,
                                rate: item.rateDesc,
                                uoM: item.unit,
                                quantity: Number(item.qty) || 0
                            }))
                        };
                }
            })();

            const DemoPayload = {
                "invoiceType": "Sale Invoice",
                "invoiceDate": "2025-12-21",
                "sellerNTNCNIC": "3520115509889",
                "sellerBusinessName": "M/S POWER MOTOR ACT ENGG",
                "sellerProvince": "PUNJAB",
                "sellerAddress": "Lahore",
                "buyerNTNCNIC": "",
                "buyerBusinessName": "FERTILIZER MANUFAC IRS NEW",
                "buyerProvince": "SINDH",
                "buyerAddress": "Karachi",
                "buyerRegistrationType": "Registered",
                "invoiceRefNo": "",
                "scenarioId": "SN002",
                "items": [
                    {
                        "hsCode": "0101.2100",
                        "productDescription": "product Description",
                        "rate": "18%",
                        "uoM": "Numbers, pieces, units",
                        "quantity": 1.0000,
                        "totalValues": 0.00,
                        "valueSalesExcludingST": 1000.00,
                        "fixedNotifiedValueOrRetailPrice": 0.00,
                        "salesTaxApplicable": 180.00,
                        "salesTaxWithheldAtSource": 0.00,
                        "extraTax": 0.00,
                        "furtherTax": 120.00,
                        "sroScheduleNo": "",
                        "fedPayable": 0.00,
                        "discount": 0.00,
                        "saleType": "Goods at standard rate (default)",
                        "sroItemSerialNo": ""
                    }
                ]
            }
            // console.log("FINAL Dummy FBR PAYLOAD", DemoPayload);
            console.log("FINAL FBR PAYLOAD", payload);

            const res = await fetch(
                "/api/fbr/postInvoiceToFBR",
                {
                    method: "POST",
                    headers: {
                        ...getFbrHeaders(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                    cache: "no-store",
                }
            );

            const data = await res.json();

            if (!res.ok) {
                console.warn("FBR ERROR:", data);
                throw new Error(data?.message || "FBR rejected invoice");
            }
            console.log("FBR RESPONSE:", data);
            const message =
                data?.fbrResponse?.validationResponse?.invoiceStatuses?.[0]?.error ||
                data?.fbrResponse?.validationResponse?.error ||
                "Posted successfully";

            alert(`Invoice result: ${message}`);
            if (data?.fbrResponse?.validationResponse?.status === "Invalid") {
                await fetch(`/api/invoice-status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: sessionStorage.getItem("userId"),
                        id: invoiceId,
                        fbrInvoiceNo: null,
                        status: 'Failed',
                    }),
                });
            } else {
                //console.log("Updating invoice status to Success with FBR invoice no:", data?.fbrResponse?.invoiceNumber);
                await fetch(`/api/invoice-status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: sessionStorage.getItem("userId"),
                        id: invoiceId,
                        fbrInvoiceNo: data?.fbrResponse?.invoiceNumber || null,
                        status: 'Success',
                    }),
                });
            }

        } catch (err) {
            // console.warn("Error posting invoice to FBR:", err.message);
        } finally {
            setProcessingInvoiceId(null);
            fetchInvoices();
             // console.log("min date from use post invocie to fbr");
            getMinDate();
        }
    };


    const deleteInvoice = async (invoiceId) => {
        if (!confirm('Delete this invoice? This action is permanent.')) return;
        setProcessingInvoiceId(invoiceId);
        try {
            const res = await fetch(`/api/invoices-crud?invoiceId=${invoiceId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                console.warn('Failed to delete invoice:', data);
                return;
            }
            fetchInvoices();
              //console.log("min date from delete invoice");
            getMinDate();
        } catch (err) {
            console.warn('Error deleting invoice:', err);
        } finally {
            setProcessingInvoiceId(null);
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            Failed: 'bg-red-100 text-red-700',
            Pending: 'bg-yellow-100 text-yellow-700',
            Success: 'bg-green-100 text-green-700',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
                {status}
            </span>
        );
    };

    const handleViewInvoice = (inv) => {
        try {

            const customerDisplay = inv.customer_name ? `${inv.customer_name} - ${inv.ntn_cnic || ''}` : '';

            const matchedScenario = scenarioCodes.find(s => s.code === inv.scenario_code || s.id === inv.scenario_code || s.id === inv.scenario_code_id);
            const scenarioDisplay = matchedScenario ? `${matchedScenario.code} - ${matchedScenario.description}` : (inv.scenario_code || '');

            // Resolve any stored province code/label to the province description used by the select
            const resolveProvinceDesc = (val) => {
                if (val === undefined || val === null || val === '') return '';
                const vStr = String(val).trim();
                const matched = provinces.find(p => String(p.stateProvinceCode) === vStr || String(p.id) === vStr || (p.stateProvinceDesc || '').trim() === vStr);
                return matched ? matched.stateProvinceDesc : (typeof val === 'string' ? val : '');
            };

            setInvoiceForm((prev) => ({
                ...prev,
                invoiceNo: inv.invoice_no || '',
                date: formatDateForInput(inv.invoice_date) || '',
                customer: customerDisplay || prev.customer,
                customerId: inv.customer_id || prev.customerId,
                scenarioCode: matchedScenario ? matchedScenario.code : (inv.scenario_code || prev.scenarioCode),
                scenarioCodeId: matchedScenario ? matchedScenario.id : prev.scenarioCodeId,
                buyerProvince: resolveProvinceDesc(inv.buyerProvince ?? inv.province ?? ''),
                sellerProvince: resolveProvinceDesc(inv.sellerProvince ?? ''),
                sellerProvinceId: inv.sellerProvinceId || prev.sellerProvinceId,
                saleType: inv.saleType || prev.saleType,
                //registrationNo: inv.registrationNo || prev.registrationNo,
                buyerType: inv.buyerType,
                // Ensure FBR reference is loaded from whichever column name is present
                fbrInvoiceRefNo: inv.fbrInvoiceRefNo ?? '',
            }));

            setCustomerSearch(customerDisplay);
            setScenarioSearch(scenarioDisplay);

            try {
                const items = inv.items ? (typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items) : [];
                // Ensure rate is preserved as string so inputs/selects show the stored value
                const sanitized = Array.isArray(items) && items.length
                    ? items.map(r => ({
                        ...emptyRow,
                        ...r,
                        rowId: r.rowId ?? genRowId(),
                        rate: r.rate === undefined || r.rate === null ? '' : String(r.rate),
                        rateId: r.rateId ?? r.rate_id ?? 0,
                        rateDesc: r.rateDesc ?? r.rate_desc ?? '',
                        TransactionTypeId: r.TransactionTypeId ?? r.TransactionTypeId ?? 0,
                        TransactionType: r.TransactionType ?? r.TransactionType ?? '',
                        sroOptions: r.sroOptions ?? [],
                        sroScheduleId: String(r.sroScheduleId ?? r.sro_id ?? r.srO_ID ?? ''),
                        sroScheduleNoId: String(r.sroScheduleNoId ?? r.sroScheduleId ?? r.sro_id ?? r.srO_ID ?? ''),
                        sroItemOptions: r.sroItemOptions ?? [],
                        sroItemId: String(r.sroItemId ?? r.srO_ITEM_ID ?? r.sro_item_id ?? ''),
                        sroItemSerialNo: r.sroItemSerialNo ?? r.sro_item_serial_no ?? '',
                        rateOptions: r.rateOptions ?? [],
                    }))
                    : [{ ...emptyRow, rowId: genRowId() }];
                // ensure existing sanitized rows include a stable rowId
                const enriched = sanitized.map(s => ({ ...s, rowId: s.rowId ?? genRowId() }));
                setRows(enriched);

                // Proactively fetch rate options and SRO options using the sanitized rows so edit mode displays
                // the appropriate selects/values immediately.
                const sellerProvDesc = resolveProvinceDesc(inv.sellerProvince ?? '');
                const invDateStr = formatDateForInput(inv.invoice_date) || '';

                setTimeout(() => {
                    sanitized.forEach((r, idx) => {
                        if (r.TransactionType || r.TransactionTypeId) {
                            fetchSalesTaxRate(idx, inv.sellerProvinceId ?? inv.sellerProvince ?? undefined, r, invDateStr).catch(err => console.warn('fetchSalesTaxRate error', err));
                        }

                        // If we already have SRO IDs in edit mode, avoid making extra API calls — just populate option arrays so selects render the stored values
                        if (r.rate || r.rateId) {
                            if (r.sroScheduleId) {
                                // ensure there's at least one option so the select can show the value without calling API
                                if (!r.sroOptions || r.sroOptions.length === 0) {
                                    const opt = { sroScheduleNo: r.sroScheduleNo ?? String(r.sroScheduleId), sro_id: r.sroScheduleId };
                                    setRowFieldsById(r.rowId, { sroOptions: [opt] });
                                }
                            } else {
                                // only fetch schedules if we don't already have an id/option
                                fetchSroScheduleOptions(idx, r, invDateStr, inv.sellerProvinceId ?? inv.sellerProvince ?? undefined).catch(err => console.warn('fetchSroScheduleOptions error', err));
                            }

                            // For SRO items: prefer existing options/ids, otherwise fetch
                            if (r.sroScheduleId) {
                                if (r.sroItemId && (!r.sroItemOptions || r.sroItemOptions.length === 0) && r.sroItemSerialNo) {
                                    setRowFieldsById(r.rowId, { sroItemOptions: [{ srO_ITEM_ID: r.sroItemId, srO_ITEM_DESC: r.sroItemSerialNo }], sroItemId: String(r.sroItemId), sroItemSerialNo: r.sroItemSerialNo });
                                } else if (!r.sroItemOptions || r.sroItemOptions.length === 0) {
                                    fetchSroItemOptions(idx, r, invDateStr).catch(err => console.warn('fetchSroItemOptions error', err));
                                }
                            }
                        }
                    });
                }, 0);
            } catch (e) {
                setRows([{ ...emptyRow, rowId: genRowId() }]);
            }

            setShowForm(true);
            setIsEditMode(true);
            setEditingInvoiceId(inv.id);
            setIsReadOnly(inv.status === 'Success');
        } catch (err) {
            console.warn('Error opening invoice from row:', err);
        }
    };

    const handleChange = (index, field, value) => {
        const updated = [...rows];
        updated[index][field] = value;

        if (field === 'amount' || field === 'salesTax') {
            const amount = Number(updated[index].amount) || 0;
            const tax = Number(updated[index].salesTax) || 0;
            updated[index].total = amount + tax;
        }

        setRows(updated);
    };


    const exportToExcel = () => {
        if (rows.length === 0) return;

        const data = rows.map(r => ({
            'Invoice No': r.invoiceNo,
            'Date': r.date,
            'Customer Type': r.customerType,
            'Customer Name': r.customerName,
            'CNIC / NTN': r.customerCnicNtn,
            'Scenario Code': r.scenarioCode,
            'FBR INV No': r.fbrInvNo,
            'Amount': r.amount,
            'Sales Tax': r.salesTax,
            'Total': r.total,
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

        ws['!cols'] = [
            { wch: 12 },
            { wch: 12 },
            { wch: 14 },
            { wch: 22 },
            { wch: 16 },
            { wch: 14 },
            { wch: 14 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
        ];

        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([buffer]), 'Invoices.xlsx');
    };

    // const postToFbr = (index) => {
    //     const updated = [...rows];

    //     updated[index].status = 'Posted';

    //     setRows(updated);
    // };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        // console.log("Form change:", name, value);

        if (name === 'sellerProvince' || name === 'sellerProvinceId') {
            // resolve province id and description when possible
            const v = String(value ?? '').trim();
            const matched = provinces.find(p => String(p.stateProvinceCode) === v || String(p.id) === v || (p.stateProvinceDesc || '').trim().toLowerCase() === v.toLowerCase());
            const sellerProvDesc = matched ? matched.stateProvinceDesc : (name === 'sellerProvince' ? value : (matched ? matched.stateProvinceDesc : ''));
            const sellerProvId = matched ? Number(matched.stateProvinceCode ?? matched.id ?? 0) : (isFinite(Number(value)) ? Number(value) : 0);

            setInvoiceForm(prev => ({ ...prev, sellerProvince: sellerProvDesc, sellerProvinceId: sellerProvId }));

            // re-fetch rates and SROs for all rows
            setTimeout(() => {
                rows.forEach((r, idx) => {
                    if (r && (r.TransactionTypeId || r.TransactionType)) fetchSalesTaxRate(idx);
                    if (r && (r.rateId || r.rate)) fetchSroScheduleOptions(idx);
                });
            }, 0);
        } else {
            console.log("Form change:", name, value);
            setInvoiceForm(prev => ({ ...prev, [name]: value }));
        }
    };


    const handleInvoiceSubmit = async (e) => {
        console.log("Submitting invoice...");
        e.preventDefault();

        // setRows(prev => [
        //     ...prev,
        //     {
        //         invoiceNo: invoiceForm.invoiceNo,
        //         date: invoiceForm.date,
        //         customerName: invoiceForm.customer,
        //         scenarioCode: invoiceForm.scenarioCode,
        //         amount: invoiceForm.totalValues,
        //         salesTax: invoiceForm.salesTaxApplicable,
        //         total:
        //             Number(invoiceForm.totalValues || 0) +
        //             Number(invoiceForm.salesTaxApplicable || 0),
        //         status: 'Not Posted',
        //     },
        // ]);
        const userId = sessionStorage.getItem("userId");
        const invoiceToSubmit = {
            userId: Number(userId),
            invoiceNo: invoiceForm.invoiceNo,
            date: invoiceForm.date,
            customer: invoiceForm.customer,
            customerId: invoiceForm.customerId,
            buyerProvince: invoiceForm.buyerProvince,
            sellerProvince: invoiceForm.sellerProvince || sessionStorage.getItem("sellerProvince") || "",
            sellerProvinceId: Number(invoiceForm.sellerProvinceId) || Number(sessionStorage.getItem("sellerProvinceId") || 0),
            scenarioCode: invoiceForm.scenarioCode,
            scenarioCodeId: invoiceForm.scenarioCodeId,
            saleType: invoiceForm.saleType,
            fbrInvoiceRefNo: invoiceForm.fbrInvoiceRefNo,
            //registrationNo: Number(invoiceForm.registrationNo),
            buyerType: invoiceForm.buyerType,
            items: rows.map((row) => ({
                hsCode: row.hsCode,
                description: row.description,
                singleUnitPrice: row.singleUnitPrice,
                qty: row.qty,
                // store rate as a string to preserve formats (e.g., '18%', 'RS-18', '18/SQ')
                rateId: Number(row.rateId) || 0,
                rate: (row.rate === undefined || row.rate === null) ? '' : String(row.rate),
                rateDesc: row.rateDesc,
                unit: row.unit,
                totalValues: row.totalValues,
                valueSalesExcludingST: row.valueSalesExcludingST,
                fixedNotifiedValueOrRetailPrice: row.fixedNotifiedValueOrRetailPrice,
                salesTaxApplicable: row.salesTaxApplicable,
                salesTaxWithheldAtSource: row.salesTaxWithheldAtSource,
                extraTax: row.extraTax,
                furtherTax: row.furtherTax,
                sroScheduleNo: row.sroScheduleNo,
                sroScheduleId: Number(row.sroScheduleId) || 0,
                sroScheduleNoId: Number(row.sroScheduleNoId ?? row.sroScheduleId) || 0,
                fedPayable: row.fedPayable,
                discount: row.discount,
                TransactionTypeId: Number(row.TransactionTypeId) || 0,
                TransactionType: row.TransactionType,
                sroItemSerialNo: row.sroItemSerialNo,
                sroItemId: Number(row.sroItemId) || 0,
            })),
        };
        console.log("Invoice to submit:", invoiceToSubmit);
        try {
            if (isEditMode && editingInvoiceId) {

                const res = await fetch('/api/invoices-crud', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ invoiceId: editingInvoiceId, ...invoiceToSubmit }),
                });

                const data = await res.json();
                if (res.ok) {
                    setShowForm(false);
                    setIsEditMode(false);
                    setIsReadOnly(false);
                    setEditingInvoiceId(null);
                    fetchInvoices();
                    minDate();
                } else {
                    console.warn('Error updating invoice:', data);
                }
            } else {

                const res = await fetch("/api/invoices-crud", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(invoiceToSubmit),
                });

                const data = await res.json();

                if (res.ok) {
                    setInvoiceForm({
                        invoiceNo: "",
                        date: "",
                        customer: "",
                        customerId: null,
                        buyerProvince: "",
                        sellerProvince: "",
                        sellerProvinceId: 0,
                        scenarioCode: "",
                        scenarioCodeId: null,
                        saleType: "",
                        // registrationNo: "",
                        buyerType: "",
                        fbrInvoiceRefNo: "",
                        exclTax: 0,
                        tax: 0,
                        inclTax: 0,
                        items: [
                            {
                                hsCode: "",
                                description: "",
                                singleUnitPrice: "",
                                qty: "",
                                rateId: 0,
                                rate: "",
                                rateDesc: "",
                                unit: "",
                                totalValues: "",
                                valueSalesExcludingST: "",
                                fixedNotifiedValueOrRetailPrice: "",
                                salesTaxApplicable: "",
                                salesTaxWithheldAtSource: "",
                                extraTax: "",
                                furtherTax: "",
                                sroScheduleNo: "",
                                sroScheduleId: '',
                                sroOptions: [],
                                sroItemOptions: [],
                                sroItemSerialNo: "",
                                sroItemId: '',
                                fedPayable: "",
                                discount: "",
                                TransactionTypeId: 0,
                                TransactionType: "",

                            },
                        ],
                    });

                    setRows([{ ...emptyRow, rowId: genRowId() }]);
                    setCustomerSearch("");
                    setScenarioSearch("");
                    setShowForm(false);
                    fetchInvoices();
                    //  console.log("min date from submit to DB");
                    getMinDate();
                } else {
                    console.warn("Error saving invoice:");
                }
            }
        } catch (err) {
            console.warn("Network error:", err);
        }
    };

    const formatCurrency = (v) => {
        const n = Number(v) || 0;
        return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    // useEffect(() => {
    //     if (!invoiceForm.registrationNo) return;
    //     console.log("Registration number changed, checking type:", invoiceForm.registrationNo);
    //     handleRegistrationCheck(invoiceForm.registrationNo);
    // }, [invoiceForm.registrationNo]);

    const handleRegistrationCheck = async (regNo) => {
        if (!regNo) return;
        //   console.log("Checking registration type for:", regNo);
        try {
            const res = await fetch(
                `/api/fbr/registrationType?regNo=${regNo}`,
                {
                    method: "GET",
                    headers: {
                        ...getFbrHeaders(),
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!res.ok) throw new Error("API error");

            const data = await res.json();
            const buyerType = data?.REGISTRATION_TYPE || "";
            //     console.log("Buyer type fetched:", buyerType);
            setInvoiceForm((prev) => ({
                ...prev,
                buyerType,
            }));
        } catch (error) {
            setInvoiceForm((prev) => ({
                ...prev,
                buyerType: "ERROR",
            }));
        }
    };

    const printInvoice = async () => {
        try {

            // await handleRegistrationCheck(invoiceForm.registrationNo);

            const sellerName = sessionStorage.getItem('sellerBusinessName') || '';
            const sellerAddress = sessionStorage.getItem('sellerAddress') || '';
            const sellerNTN = sessionStorage.getItem('sellerNTNCNIC') || '';

            const invoiceNo = invoiceForm.invoiceNo || '';
            const invoiceDate = invoiceForm.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const customerName = invoiceForm.customer || '';
            const customerAddress = customers.find(c => c.id === invoiceForm.customerId)?.address || "";
            // const customerAddress = invoiceForm.buyerAddress || '';
            const customerProvince = invoiceForm.buyerProvince || '';
            // const customerNTN =
            //     customers.find(c => c.id === invoiceForm.customerId)?.ntn ||
            //     customers.find(c => c.id === invoiceForm.customerId)?.cnic_inc ||
            //     "";
            const customer = customers.find(c => c.id === invoiceForm.customerId);

            const idLabel = customer?.ntn ? "N.T.N" : "C.N.I.C";
            const idValue = customer?.ntn || customer?.cnic_inc || "";


            const currency = 'PKR';
            const scenarioCode = invoiceForm.scenarioCode || '';
            const tableRows = rows.map((r, index) => `
  <tr>
    <td style="border:1px solid #000; padding:4px; text-align:center;">${r.hsCode || ''}</td>
    <td style="border:1px solid #000; padding:4px;">${r.description || ''}</td>
    <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.singleUnitPrice || 0)}</td>
    <td style="border:1px solid #000; padding:4px; text-align:center;">${r.discount || 0}</td>
    <td style="border:1px solid #000; padding:4px; text-align:center;">${r.qty || ''}</td>
    <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.valueSalesExcludingST || r.totalValues || 0)}</td>
    <td style="border:1px solid #000; padding:4px; text-align:right;">(${r.rate}%)<br>${formatNumber(r.salesTaxApplicable || 0)}</td>
    <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.furtherTax || 0)}</td>
    <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.extraTax || 0)}</td>  
    <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.salesTaxWithheldAtSource || 0)}</td>
    <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.totalValues || r.valueInclTax || 0)}</td>
  </tr>
`).join('');

            const totalDisc = rows.reduce((sum, r) => sum + Number(r.discount || 0), 0);
            const totalQty = rows.reduce((sum, r) => sum + Number(r.qty || 0), 0);
            const totalFurthurTax = rows.reduce((sum, r) => sum + Number(r.furtherTax || 0), 0);
            const totalExtraTax = rows.reduce((sum, r) => sum + Number(r.extraTax || 0), 0);
            const totalSalesTaxWithheldAtSource = rows.reduce((sum, r) => sum + Number(r.salesTaxWithheldAtSource || 0), 0);
            const totalExclTax = rows.reduce((sum, r) => sum + Number(r.valueSalesExcludingST || 0), 0);
            const totalTax = rows.reduce((sum, r) => sum + Number(r.salesTaxApplicable || 0), 0);
            const totalInclTax = totalExclTax + totalTax;

            const fbrInvoiceNo = invoices.find(inv => inv.invoice_no === invoiceForm.invoiceNo)?.fbr_invoice_no || '';
            let qrCodeUrl = "";

            if (fbrInvoiceNo) {
                qrCodeUrl = await QRCode.toDataURL(fbrInvoiceNo, {
                    width: 200,
                    margin: 1
                });
            }
            function imageToBase64(url) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = function () {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;

                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0);

                        resolve(canvas.toDataURL("image/jpeg"));
                    };
                    img.onerror = reject;
                    img.src = url;
                });
            }
            const fbrLogoUrl = await imageToBase64('/images/fbr_logo.png');
            // console.log("QR:", qrCodeUrl);
            const baseUrl =
                typeof window !== "undefined"
                    ? window.location.origin
                    : "";

            const printContent = `
<div style="font-family: Arial, sans-serif; font-size: 12px; max-width: 210mm; margin: 0 auto; padding: 15px; line-height: 1.4;">
  <!-- Header -->
  <div style="text-align:center; font-weight:bold; font-size:16px; margin-bottom:4px;">
    ${sellerName.toUpperCase()}
  </div>
  <div style="text-align:center; font-size:11px; margin-bottom:2px;">
    ${sellerAddress.toUpperCase()}
  </div>
  <div style="text-align:center; font-size:11px; margin-bottom:12px;">
    NTN/CNIC No. ${sellerNTN}
  </div>

  <!-- Title -->
  <div style="text-align:center; font-weight:bold; font-size:14px; margin:12px 0;">
    SALES TAX INVOICE
  </div>

  <!-- Billing To + Invoice details -->
  <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:12px;">
    <tr>
      <td style="width:55%; vertical-align:top; border:1px solid #000; padding:6px;">
        <strong>Billing To:</strong><br>
        ${customerName}<br>
        Address: ${customerAddress || 'Address not provided'}<br>
        Province: ${customerProvince}<br>
         ${idLabel}: ${idValue}
      </td>
      <td style="width:45%; vertical-align:top; border:1px solid #000; padding:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td><strong>Invoice Number</strong></td><td>${invoiceNo}</td></tr>
          <tr><td><strong>Date</strong></td><td>${invoiceDate}</td></tr>
          <tr><td><strong>Invoice Type</strong></td><td>Sale Invoice</td></tr>
          <tr><td><strong>Buyer Type</strong></td><td>${invoiceForm.buyerType || ''}</td></tr>
          <tr><td><strong>Currency</strong></td><td>${currency || 'PKR'}</td></tr>
          <tr><td><strong>Scenario Code</strong></td><td>${scenarioCode || '-'}</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Items Table – FIXED -->
  <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:12px; border:1px solid #000;">
    <thead style="background:#d9d9d9; font-weight:bold;">
      <tr>
        <th style="border:1px solid #000; padding:5px; width:8%;">HS Code</th>
        <th style="border:1px solid #000; padding:5px; width:30%;">Desc</th>
        <th style="border:1px solid #000; padding:5px; width:11%;">Unit Rate</th>
        <th style="border:1px solid #000; padding:5px; width:11%;">Discount</th>
        <th style="border:1px solid #000; padding:5px; width:7%;">Qty</th>
        <th style="border:1px solid #000; padding:5px; width:13%;">Value Excl. Sales Tax</th>
        <th style="border:1px solid #000; padding:5px; width:13%;">Sales Tax Amount</th>
        <th style="border:1px solid #000; padding:5px; width:13%;">Further Tax</th>
        <th style="border:1px solid #000; padding:5px; width:13%;">Extra Tax</th>
        <th style="border:1px solid #000; padding:5px; width:13%;">With Held Sales Tax</th>   
        <th style="border:1px solid #000; padding:5px; width:14%;">Value Incl. Sales Tax</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr style="font-weight:bold; background:#f2f2f2;">
        <td colspan="3" style="border:1px solid #000; padding:6px; text-align:right;">Total</td>
        <td style="border:1px solid #000; padding:6px; text-align:right;">${formatNumber(totalDisc)}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right;">${formatNumber(totalQty)}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right;">${formatNumber(totalExclTax)}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right;">${formatNumber(totalExclTax)}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right;">${formatNumber(totalFurthurTax)}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right;">${formatNumber(totalExtraTax)}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right;">${formatNumber(totalSalesTaxWithheldAtSource)}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right;">${formatNumber(totalInclTax)}</td>
      </tr>
    </tbody>
  </table>

${fbrInvoiceNo ? `
<div style="
  display:flex;
  align-items:center;
  justify-content:space-between;
  font-size:11px;
  margin-top:10px;
  width:100%;
">
  <!-- LEFT: Invoice number -->
  <div>
    <strong>FBR INVOICE #:</strong> ${fbrInvoiceNo}
  </div>

  <!-- RIGHT: QR + Logo -->
  <div style="
    display:flex;
    align-items:center;
    gap:6px;
  ">
    <img
      id="fbr-qr"
      src="${qrCodeUrl}"
      width="80"
      height="80"
      alt="FBR QR Code"
    />
    <img
      id="fbr-logo"
      src="${fbrLogoUrl}"
      width="80"
      height="80"
      alt="FBR Logo"
    />
  </div>
</div>
` : 'Note: This Invoice is not verified form FBR'}

</div>
`;

            let printDiv = document.getElementById('print-invoice-container');
            if (!printDiv) {
                printDiv = document.createElement('div');
                printDiv.id = 'print-invoice-container';
                printDiv.style.position = 'absolute';
                printDiv.style.left = '-9999px';
                document.body.appendChild(printDiv);
            }

            printDiv.innerHTML = printContent;
            const qrImg = printDiv.querySelector('#fbr-qr');

            if (qrImg) {
                await new Promise((resolve) => {
                    if (qrImg.complete) return resolve();
                    qrImg.onload = resolve;
                    qrImg.onerror = resolve;
                });
            }

            printDiv.offsetHeight

            window.print();

            setTimeout(() => { printDiv.innerHTML = ''; }, 3000);

        } catch (err) {
            console.warn('Print failed:', err);
            alert('Failed to generate print view.\nUse Ctrl+P to print manually.');
        }
    };
    const formatNumber = (num) => {
        return Number(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    // const handleInputChange = (index, name, value) => {
    //     console.log(`Row ${index} change:`, name, value);
    //     const newRows = [...rows];
    //     newRows[index][name] = value;

    //     if (name === "hsCode") {
    //         const hs = hsCodes.find((h) => h.hS_CODE === value);
    //         newRows[index].description = hs ? hs.description : "";
    //     }

    //     setRows(newRows);

    //     // If sale type changed, attempt to fetch sales tax rate for that row
    //     if (name === "TransactionType") {
    //         setTimeout(() => {
    //             fetchSalesTaxRate(index);
    //         }, 0);
    //     }

    //     // If rate value changed, fetch SRO schedule options (depends on rate, date and supplier)
    //     if (name === 'rate') {
    //         setTimeout(() => {
    //             fetchSroScheduleOptions(index);
    //         }, 0);
    //     }
    // };
    const handleInputChange = (index, name, value) => {
        // console.log(`Row ${index} change:`, name, value);

        setRows((prevRows) => {
            const newRows = [...prevRows];
            const row = { ...newRows[index], [name]: value };

            // HS code → description
            if (name === "hsCode") {
                const hs = hsCodes.find((h) => h.hS_CODE === value);
                row.description = hs ? hs.description : "";
            }

            // TransactionType selection: support setting by id or description
            if (name === "TransactionType" || name === "TransactionTypeId") {
                const valStr = String(value).trim();
                let found = null;
                if (name === "TransactionTypeId") {
                    found = transTypeList.find(t => String(t.transactioN_TYPE_ID) === valStr);
                } else {
                    // could be id or description
                    found = transTypeList.find(t => String(t.transactioN_TYPE_ID) === valStr || (t.transactioN_DESC || '').trim().toLowerCase() === valStr.toLowerCase());
                }
                if (found) {
                    row.TransactionTypeId = found.transactioN_TYPE_ID;
                    row.TransactionType = found.transactioN_DESC;
                } else {
                    // if not found, clear the id but keep provided value as description
                    if (name === "TransactionTypeId") {
                        row.TransactionTypeId = Number(value) || 0;
                    } else {
                        row.TransactionType = value;
                    }
                }
            }

            // Rate selection: support setting by displayed value or explicit ratE_ID
            if (name === "rate" || name === "rateId") {
                const opts = row.rateOptions ?? [];
                if (name === "rateId") {
                    // find matching option
                    const found = opts.find(o => String(o.ratE_ID) === String(value) || String(o.ratE_VALUE) === String(value));
                    if (found) {
                        row.rateId = found.ratE_ID;
                        row.rate = String(found.ratE_VALUE ?? found.ratE_ID ?? found.ratE_DESC);
                        row.rateDesc = found.ratE_DESC ?? "";
                    } else {
                        row.rateId = Number(value) || 0;
                    }
                } else {
                    // name === 'rate' (display value)
                    const found = opts.find(o => String(o.ratE_VALUE) === String(value) || String(o.ratE_ID) === String(value) || String(o.ratE_DESC) === String(value));
                    if (found) {
                        row.rateId = found.ratE_ID;
                        row.rateDesc = found.ratE_DESC ?? "";
                        row.rate = String(found.ratE_VALUE ?? found.ratE_ID ?? found.ratE_DESC);
                    } else {
                        row.rate = value;
                    }
                }

                // when rate changes, clear SRO selection to force reload
                row.sroOptions = [];
                row.sroScheduleNo = "";
                row.sroScheduleId = '';
                row.sroItemOptions = [];
                row.sroItemId = '';
                row.sroItemSerialNo = '';
            }

            // SRO schedule selection: support selecting by id or value and clear/fetch items
            if (name === 'sroScheduleNo' || name === 'sroScheduleId') {
                const opts = row.sroOptions ?? [];
                let found = null;
                if (name === 'sroScheduleId') {
                    found = opts.find(o => String(o.sro_id ?? o.srO_ID ?? o.id) === String(value));
                } else {
                    found = opts.find(o => String(o.sroScheduleNo ?? o.sro_id ?? o.id) === String(value) || String(o.srO_DESC || '').trim() === String(value).trim());
                }

                if (found) {
                    const idStr = String(found.sro_id ?? found.srO_ID ?? found.id ?? '');
                    row.sroScheduleId = idStr;
                    row.sroScheduleNoId = idStr;
                    row.sroScheduleNo = found.sroScheduleNo ?? found.srO_DESC ?? String(found.sro_id ?? found.srO_ID ?? found.id);
                } else {
                    if (name === 'sroScheduleId') {
                        row.sroScheduleId = String(value);
                        row.sroScheduleNoId = String(value);
                    }
                    if (name === 'sroScheduleNo') row.sroScheduleNo = value;
                }

                // clear dependent item selection
                row.sroItemOptions = [];
                row.sroItemId = '';
                row.sroItemSerialNo = '';
            }

            // SRO Item selection: set id and serial/desc
            if (name === 'sroItemId' || name === 'sroItemSerialNo') {
                const opts = row.sroItemOptions ?? [];
                let found = null;
                if (name === 'sroItemId') {
                    found = opts.find(o => String(o.srO_ITEM_ID ?? o.id) === String(value));
                } else {
                    found = opts.find(o => String(o.srO_ITEM_DESC ?? '').trim() === String(value).trim());
                }

                if (found) {
                    row.sroItemId = Number(found.srO_ITEM_ID ?? found.id) || 0;
                    row.sroItemSerialNo = found.srO_ITEM_DESC ?? String(found);
                } else {
                    if (name === 'sroItemId') row.sroItemId = Number(value) || 0;
                    if (name === 'sroItemSerialNo') row.sroItemSerialNo = value;
                }
            }

            /* ===== CALCULATE TOTAL VALUES HERE ===== */
            const n = (v) => (isNaN(Number(v)) ? 0 : Number(v));

            const price = n(row.singleUnitPrice);
            const quantity = n(row.qty);
            const discount = n(row.discount);
            const fnvrp = n(row.fixedNotifiedValueOrRetailPrice);

            const effectiveUnitPrice = Math.max(price, fnvrp);
            const subtotal = effectiveUnitPrice * quantity;
            const netValue = Math.max(0, subtotal - discount);
            row.valueSalesExcludingST = netValue.toFixed(2);

            let salesTaxApplicable = 0;

            const desc = (
                row.rateOptions?.find(
                    (opt) =>
                        String(opt.ratE_VALUE ?? opt.ratE_ID) === String(row.rate)
                )?.ratE_DESC || row.rateDesc || ""
            )
                .toLowerCase()
                .trim();

            if (!desc.includes("except") && !desc.includes("dtre")) {
                const percentMatch = desc.match(/(\d+(\.\d+)?)\s*%/);
                if (percentMatch) {
                    salesTaxApplicable +=
                        netValue * (parseFloat(percentMatch[1]) / 100);
                }

                const perUnitMatch = desc.match(/rs\.?\s*(\d+)\s*\/\s*(kg|mt|sqy)/);
                if (perUnitMatch) {
                    salesTaxApplicable += quantity * n(perUnitMatch[1]);
                }

                const alongWithMatch = desc.match(
                    /rupees\s*(\d+)\s*per\s*kilogram/
                );
                if (alongWithMatch) {
                    salesTaxApplicable += quantity * n(alongWithMatch[1]);
                }

                const fixedRsMatch = desc.match(/^rs\.?\s*(\d+)$/);
                if (fixedRsMatch) {
                    salesTaxApplicable += n(fixedRsMatch[1]);
                }

                const perBillMatch = desc.match(/(\d+)\s*\/\s*bill/);
                if (perBillMatch) {
                    salesTaxApplicable += n(perBillMatch[1]);
                }
            }
            row.salesTaxApplicable = salesTaxApplicable.toFixed(2);
            const grandTotal =
                netValue +
                n(row.salesTaxApplicable) +
                n(row.salesTaxWithheldAtSource) +
                n(row.extraTax) +
                n(row.furtherTax) +
                n(row.fedPayable);

            // 🔴 THIS IS THE IMPORTANT LINE
            row.totalValues = grandTotal.toFixed(2);
            newRows[index] = row;
            const totalExclTax = newRows.reduce((sum, r) => sum + Number(r.valueSalesExcludingST || 0), 0);
            const totalTax = newRows.reduce((sum, r) => sum + Number(r.salesTaxApplicable || 0), 0);
            const totalInclTax = totalExclTax + totalTax;

            invoiceForm.exclTax = totalExclTax.toFixed(2);
            invoiceForm.tax = totalTax.toFixed(2);
            invoiceForm.inclTax = totalInclTax.toFixed(2);
            //console.log(`Invoice totals: ExclTax=${invoiceForm.exclTax}, Tax=${invoiceForm.tax}, InclTax=${invoiceForm.inclTax}`);


            // Schedule dependent fetches using the updated row to avoid race conditions
            setTimeout(() => {
                if (name === "TransactionType" || name === "TransactionTypeId") {
                    fetchSalesTaxRate(index, undefined, row);
                }
                if (name === "rate" || name === "rateId") {
                    fetchSroScheduleOptions(index, row, undefined, invoiceForm.sellerProvinceId ?? invoiceForm.sellerProvince ?? undefined);
                }
                // When SRO schedule is selected by id or value, fetch item options
                if (name === 'sroScheduleNo' || name === 'sroScheduleId') {
                    // Resolve id
                    const sroId = row.sroScheduleId || Number(row.sroScheduleNo || 0);
                    if (sroId) {
                        // clear previous item selection then fetch items
                        // handleInputChange(index, 'sroItemOptions', []);
                        // handleInputChange(index, 'sroItemId', 0);
                        // handleInputChange(index, 'sroItemSerialNo', '');
                        fetchSroItemOptions(index, row, undefined);
                    }
                }

            }, 0);

            return newRows;
        });
    };


    const handleHSSelect = (index, hs) => {
        const newRows = [...rows];
        newRows[index].hsCode = hs.hs_code;
        newRows[index].description = hs.description;
        setRows(newRows);
    };

    const handleUOMSelect = (index, unit) => {
        const newRows = [...rows];
        newRows[index].unit = unit;
        setRows(newRows);
    };

    const addRow = () => setRows(prev => [...prev, { ...emptyRow, rowId: genRowId() }]);
    const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));


    // const lastMonthDate = new Date();
    // lastMonthDate.setDate(lastMonthDate.getDate() - 30);
    // const minDate = lastMonthDate.toISOString().split("T")[0];
    let today;
    let minDate;
    function getMinDate() {
        today = new Date().toISOString().split("T")[0];

        // Filter invoices with success status
        const successInvoices = invoices.filter(inv => inv.status === "Success");

        if (successInvoices.length > 0) {
           // console.log("success invocies ", successInvoices.length)
            // Get the **last invoice** by date
            const lastInvoice = successInvoices.reduce((latest, inv) => {
                const invDate = new Date(inv.invoice_date);
                return invDate > new Date(latest.invoice_date) ? inv : latest;
            }, successInvoices[0]);

            const d = new Date(lastInvoice.invoice_date);

            // Format in local YYYY-MM-DD
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");

            minDate = `${year}-${month}-${day}`;
          //  console.log("minDate", minDate);
        } else {
            // const lastMonthDate = new Date();
            // lastMonthDate.setDate(lastMonthDate.getDate() - 30);
            // minDate = lastMonthDate.toISOString().split("T")[0];
            minDate = "";
            // console.log("else case minDate", minDate);
        }

    }
    getMinDate();
    // useEffect(() => {
    //     console.log("min date from use Effect");
    //     getMinDate();
    // }

    // ), [invoices.length];

    // const formatDateForInput = (value) => {
    //     if (!value) return '';
    //     try {
    //         if (typeof value === 'string') {
    //             if (value.includes('T')) return value.split('T')[0];
    //             if (value.length >= 10) return value.slice(0, 10);
    //         }
    //         const d = new Date(value);
    //         if (!isNaN(d)) return d.toISOString().split('T')[0];
    //     } catch (e) {

    //     }
    //     return '';
    // };
    const formatDateForInput = (value) => {
        if (!value) return '';

        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }

        const d = new Date(value);
        if (isNaN(d)) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };



    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl md:text-4xl font-bold">Invoice Table</h1>

                <div className="flex gap-3">
                    <button
                        onClick={() => {

                            setShowForm(true);
                            setIsEditMode(false);
                            setIsReadOnly(false);
                            setEditingInvoiceId(null);

                            setInvoiceForm({
                                invoiceNo: latestInvoice || '',
                                date: minDate,
                                customer: '',
                                customerId: 0,
                                buyerProvince: '',
                                sellerProvince: sessionStorage.getItem("sellerProvince") || '',
                                sellerProvinceId: Number(sessionStorage.getItem("sellerProvinceId") || 0),
                                scenarioCode: '',
                                scenarioCodeId: 0,
                                saleType: '',
                                registrationNo: '',
                                items: [{ ...emptyRow, rowId: genRowId() }],
                            });
                            setRows([{ ...emptyRow, rowId: genRowId() }]);
                            setCustomerSearch('');
                            setScenarioSearch('');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg"
                    >
                        +
                    </button>

                    <button
                        onClick={exportToExcel}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        <DocumentArrowDownIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
            {showForm && (
                <div className="fixed inset-0 backdrop-blur-xs bg-black/30 z-50 flex items-center justify-center px-3">
                    <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-xl shadow-lg p-6 w-full max-w-8xl h-[90vh] overflow-y-auto custom-scroll`}>


                        <form onSubmit={handleInvoiceSubmit} className="">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">{isEditMode ? (isReadOnly ? 'View Invoice' : 'Edit Invoice') : 'Add Invoice'}</h2>
                                <div className="flex gap-4 items-center">
                                    {!isReadOnly && (
                                        <button
                                            type="submit"
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2"
                                        >
                                            <DocumentArrowDownIcon className="h-6 w-6" />
                                            Save
                                        </button>
                                    )}

                                    {isReadOnly && (
                                        <button
                                            type="button"
                                            disabled
                                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md font-semibold flex items-center gap-2 cursor-not-allowed"
                                        >
                                            <DocumentArrowDownIcon className="h-6 w-6" />
                                            Read-only
                                        </button>
                                    )}

                                    {/* Print button — available when viewing or editing an invoice */}
                                    {(isEditMode || isReadOnly) && (
                                        <button
                                            type="button"
                                            onClick={printInvoice}
                                            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md font-semibold"
                                        >
                                            Print
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            setShowForm(false);
                                            setIsEditMode(false);
                                            setIsReadOnly(false);
                                            setEditingInvoiceId(null);
                                            setCustomerSearch('');
                                            setScenarioSearch('');
                                        }}
                                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
                                {/* <div>
                                    <label className="block text-sm font-medium mb-1">Invoice No *</label>
                                    <input name="invoiceNo" value={invoiceForm.invoiceNo} onChange={handleFormChange} className="w-full border rounded-md px-3 py-2" required />
                                </div> */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Invoice No *</label>
                                    <input
                                        type="text"
                                        name="invoiceNo"
                                        value={invoiceForm.invoiceNo}
                                        onChange={(e) => {
                                            const canEdit = !isEditMode && Number(latestInvoice) === 1;
                                            if (canEdit) {
                                                const numericValue = e.target.value.replace(/\D/g, '');
                                                setInvoiceForm((prev) => ({ ...prev, invoiceNo: numericValue }));
                                            }
                                        }}
                                        onBlur={() => {
                                            const canEdit = !isEditMode && Number(latestInvoice) === 1;
                                            if (canEdit && (!invoiceForm.invoiceNo || invoiceForm.invoiceNo === '')) {
                                                setInvoiceForm((prev) => ({ ...prev, invoiceNo: '1' }));
                                            }
                                        }}
                                        className="w-full border rounded-md px-3 py-2"
                                        required
                                        readOnly={isEditMode || isReadOnly || Number(latestInvoice) !== 1}
                                        pattern="\d*"
                                    />
                                    {Number(latestInvoice) !== 1 && !isEditMode && (
                                        <p className="text-gray-500 text-sm mt-1">
                                            Invoice number auto-assigned, cannot be changed.
                                        </p>
                                    )}
                                </div>


                                {/* <div>
                                    <label className="block text-sm font-medium mb-1">Date *</label>
                                    <input type="date" name="date" value={invoiceForm.date} onChange={handleFormChange} className="w-full border rounded-md px-3 py-2" required />
                                </div> */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date *</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={invoiceForm.date}
                                        onChange={handleFormChange}
                                        className="w-full border rounded-md px-3 py-2"
                                        min={minDate}
                                        max={today}
                                        required
                                        readOnly={isReadOnly}
                                    />
                                </div>

                                {/* <div>
                                    <label className="block text-sm font-medium mb-1">Customer *</label>
                                    <input name="customer" value={invoiceForm.customer} onChange={handleFormChange} className="w-full border rounded-md px-3 py-2" required />
                                </div> */}
                                <div className="relative w-full group">
                                    <label className="block text-sm font-medium mb-1">Customer *</label>

                                    <input
                                        type="text"
                                        value={customerSearch}
                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                        placeholder="Search customer..."
                                        className="w-full border rounded-md px-3 py-2"
                                        readOnly={isReadOnly}
                                        required
                                    />

                                    <div className="absolute left-0 right-0 top-full -mt-px bg-white border rounded-md max-h-40 overflow-y-auto z-50 shadow-lg hidden group-focus-within:block">
                                        {customers
                                            .filter((c) =>
                                                `${c.business_name} - ${c.ntn || c.cnic_inc}`
                                                    .toLowerCase()
                                                    .includes(customerSearch.toLowerCase())
                                            )
                                            .map((c) => {
                                                const displayValue = `${c.business_name} - ${c.ntn || c.cnic_inc}`;
                                                const regNoToUse = c.ntn || c.cnic_inc || '';
                                                return (
                                                    <div
                                                        key={c.id}
                                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                        // onMouseDown={() => {
                                                        //     setInvoiceForm((prev) => ({ ...prev, customerId: c.id, customer: displayValue }));
                                                        //     setCustomerSearch(displayValue);
                                                        // }}
                                                        onMouseDown={() => {
                                                            setInvoiceForm((prev) => ({
                                                                ...prev,
                                                                customerId: c.id,
                                                                customer: displayValue,
                                                                buyerProvince: c.province || c.buyerProvince || "",
                                                                // registrationNo: regNoToUse,
                                                            }));
                                                            setCustomerSearch(displayValue);
                                                            // if (regNoToUse) {
                                                            //     setTimeout(async() => {
                                                            //         await handleRegistrationCheck(regNoToUse);
                                                            //     }, 100);
                                                            // }
                                                        }}
                                                    >
                                                        {displayValue}
                                                    </div>
                                                );
                                            })}

                                    </div>
                                </div>

                                {/* <div>
                                    <label className="block text-sm font-medium mb-2">Customer Province *</label>

                                    <select
                                        name="buyerProvince"
                                        value={invoiceForm.buyerProvince || ''}
                                        onChange={handleFormChange}
                                        className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                        required
                                    //disabled={loading}
                                    >
                                        <option value="">Select Province</option>

                                        {loading && <option value="" disabled>Loading provinces...</option>}

                                        {provinces.map((prov) => (
                                            <option
                                                key={prov.stateProvinceCode}
                                                value={prov.stateProvinceDesc}
                                            >
                                                {prov.stateProvinceDesc}
                                            </option>
                                        ))
                                      }
                                    </select>


                                </div> */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Customer Province *
                                    </label>

                                    {isReadOnly ? (
                                        <>
                                            {/* Show selected province as text */}
                                            <input
                                                type="text"
                                                value={invoiceForm.buyerProvince || ''}
                                                className="w-full border border-[#B0B0B0] rounded-md p-2 bg-gray-100 text-[#4E4E4E]"
                                                readOnly
                                            />

                                            {/* Preserve value for form submission */}
                                            <input
                                                type="hidden"
                                                name="buyerProvince"
                                                value={invoiceForm.buyerProvince || ''}
                                            />
                                        </>
                                    ) : (
                                        <select
                                            name="buyerProvince"
                                            value={invoiceForm.buyerProvince || ''}
                                            onChange={handleFormChange}
                                            className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                            required
                                            disabled={loading}
                                        >
                                            <option value="">Select Province</option>

                                            {loading && (
                                                <option value="" disabled>
                                                    Loading provinces...
                                                </option>
                                            )}

                                            {provinces.map((prov) => (
                                                <option
                                                    key={prov.stateProvinceCode}
                                                    value={prov.stateProvinceDesc}
                                                >
                                                    {prov.stateProvinceDesc}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* <div>
                                    <label className="block text-sm font-medium mb-2">Seller Province *</label>

                                    <select
                                        name="sellerProvinceId"
                                        value={invoiceForm.sellerProvinceId || ''}
                                        onChange={handleFormChange}
                                        defaultValue={Number(sessionStorage.getItem("sellerProvinceId") || '')}
                                        className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                        required
                                        readOnly={isReadOnly}
                                    //disabled={loading}
                                    >
                                        <option value="">Select Province</option>

                                        {loading && <option value="" disabled>Loading provinces...</option>}

                                        {!isReadOnly &&provinces.map((prov) => (
                                            <option
                                                key={prov.stateProvinceCode}
                                                value={prov.stateProvinceCode}
                                            >
                                                {prov.stateProvinceDesc}
                                            </option>
                                        ))}
                                    </select>

                                    <input type="hidden" name="sellerProvince" value={invoiceForm.sellerProvince || ''} />
                                </div> */}

                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Seller Province *
                                    </label>

                                    {isReadOnly ? (
                                        <>
                                            {/* Display selected province as plain text */}
                                            <input
                                                type="text"
                                                value={
                                                    provinces.find(
                                                        p => p.stateProvinceCode === invoiceForm.sellerProvinceId
                                                    )?.stateProvinceDesc || ''
                                                }
                                                className="w-full border border-[#B0B0B0] rounded-md p-2 bg-gray-100 text-[#4E4E4E]"
                                                readOnly
                                            />

                                            {/* Keep actual value for form submission */}
                                            <input
                                                type="hidden"
                                                name="sellerProvinceId"
                                                value={invoiceForm.sellerProvinceId || ''}
                                            />
                                        </>
                                    ) : (
                                        <select
                                            name="sellerProvinceId"
                                            value={invoiceForm.sellerProvinceId || ''}
                                            onChange={handleFormChange}
                                            className="w-full border border-[#B0B0B0] rounded-md p-2 bg-white text-[#4E4E4E] focus:border-[#5AB3E8] focus:ring-1 focus:ring-[#5AB3E8] transition-all duration-300 outline-none"
                                            required
                                            disabled={loading}
                                        >
                                            <option value="">Select Province</option>

                                            {loading && (
                                                <option value="" disabled>
                                                    Loading provinces...
                                                </option>
                                            )}

                                            {provinces.map((prov) => (
                                                <option
                                                    key={prov.stateProvinceCode}
                                                    value={prov.stateProvinceCode}
                                                >
                                                    {prov.stateProvinceDesc}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Optional hidden description for compatibility */}
                                    <input
                                        type="hidden"
                                        name="sellerProvince"
                                        value={invoiceForm.sellerProvince || ''}
                                    />
                                </div>



                                {/* <div>
                                    <label className="block text-sm font-medium mb-1">Scenario Code</label>
                                    <input name="scenarioCode" value={invoiceForm.scenarioCode} onChange={handleFormChange} className="w-full border rounded-md px-3 py-2" />
                                </div> */}
                                <div className="relative w-full group">
                                    <label className="block text-sm font-medium mb-1">Scenario Code</label>

                                    <input
                                        type="text"
                                        value={scenarioSearch}
                                        onChange={(e) => setScenarioSearch(e.target.value)}
                                        placeholder="Select scenario code..."
                                        className="w-full border rounded-md px-3 py-2"
                                        readOnly={isReadOnly}
                                        required
                                    />

                                    <div className="absolute left-0 right-0 top-full -mt-px bg-white border rounded-md max-h-40 overflow-y-auto z-50 shadow-lg hidden group-focus-within:block">
                                        {scenarioCodes
                                            .filter((s) =>
                                                `${s.code} - ${s.description}`
                                                    .toLowerCase()
                                                    .includes(scenarioSearch.toLowerCase())
                                            )
                                            .map((s) => (
                                                <div
                                                    key={s.id}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                    onMouseDown={() => {
                                                        const value = `${s.code} - ${s.description}`;
                                                        setInvoiceForm((prev) => ({
                                                            ...prev,
                                                            scenarioCodeId: s.id,
                                                            scenarioCode: s.code,
                                                        }));
                                                        setScenarioSearch(value);
                                                    }}
                                                >
                                                    {s.code} - {s.description}
                                                </div>
                                            ))}

                                        {scenarioCodes.filter((s) =>
                                            `${s.code} - ${s.description}`
                                                .toLowerCase()
                                                .includes(scenarioSearch.toLowerCase())
                                        ).length === 0 && (
                                                <div className="px-3 py-2 text-gray-400">No scenario found</div>
                                            )}
                                    </div>
                                </div>
                                <div className="relative w-full group">
                                    <label className="block text-sm font-medium mb-1">Sale Type</label>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="saleType"
                                            value={invoiceForm.saleType || ""}
                                            onChange={handleFormChange}
                                            placeholder="Select or type sale type..."
                                            className={`
                                                        w-full border rounded px-3 py-2 text-sm
                                                         ${isReadOnly
                                                    ? "bg-gray-50 text-gray-700 cursor-default"
                                                    : "bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"}
                                             `}
                                            readOnly={isReadOnly}
                                            onFocus={(e) => !isReadOnly && e.target.select()}
                                            required
                                        />

                                        {!isReadOnly && (
                                            <div
                                                className="
                                                    absolute top-full left-0 w-full mt-1
                                                    bg-white border border-gray-300 rounded-md 
                                                    max-h-60 overflow-y-auto shadow-lg z-50
                                                    hidden group-focus-within:block
                                                    "
                                            >
                                                {saleTypeList
                                                    .filter((item) => {
                                                        const search = (invoiceForm.saleType || "").trim().toLowerCase();
                                                        // Show all options if search is empty or very short
                                                        if (search.length <= 1) return true;
                                                        return item.docDescription.toLowerCase().includes(search);
                                                    })
                                                    .map((item) => (
                                                        <div
                                                            key={item.docTypeId}
                                                            className={`
                                                                px-4 py-2.5 text-sm cursor-pointer
                                                                hover:bg-blue-50 transition-colors
                                                                ${item.docDescription === invoiceForm.saleType
                                                                    ? "bg-blue-100 font-medium text-blue-800"
                                                                    : "text-gray-800"}
                                                            `}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault(); // prevents input blur before selection
                                                                setInvoiceForm((prev) => ({
                                                                    ...prev,
                                                                    saleType: item.docDescription,
                                                                }));
                                                                // Optional: blur to close dropdown immediately after pick
                                                                // e.currentTarget.closest('input')?.blur();
                                                            }}
                                                        >
                                                            {item.docDescription}
                                                        </div>
                                                    ))}

                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Registration No
                                    </label>

                                    <input
                                        type="text"
                                        name="registrationNo"
                                        placeholder="1234567"
                                        value={invoiceForm.registrationNo}
                                        maxLength={13}
                                        onChange={(e) => {
                                            const numericValue = e.target.value.replace(/\D/g, '');
                                            setInvoiceForm((prev) => ({ ...prev, registrationNo: numericValue }));

                                        }}
                                        // onBlur={() => {
                                        //     if (!invoiceForm.registrationNo || invoiceForm.registrationNo === '') {
                                        //         setInvoiceForm((prev) => ({ ...prev, registrationNo: '1' }));
                                        //     }
                                        // }}
                                        onBlur={async (e) => {
                                            // const numericValue = e.target.value.replace(/\D/g, "");

                                            // setInvoiceForm((prev) => ({
                                            //     ...prev,
                                            //     registrationNo: numericValue,
                                            //     buyerType: "",
                                            // }));

                                            // if (numericValue.length >= 7) {
                                            //     handleRegistrationCheck(numericValue);
                                            // }
                                        }}
                                        className="w-full border rounded-md px-3 py-2"
                                        required
                                        inputMode="numeric"
                                        readOnly
                                    // pattern="/d*"
                                    />
                                    {invoiceForm.buyerType && (
                                        <p
                                            className={`mt-1 text-sm font-medium
                                                    ${invoiceForm.buyerType === "unregistered"
                                                    ?
                                                    "text-red-600" : "text-green-600"
                                                }`}
                                        >
                                            {invoiceForm.buyerType}
                                        </p>
                                    )}

                                </div> */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Buyer Registration Type *</label>
                                    <select
                                        name="buyerType"
                                        value={invoiceForm.buyerType || ''}
                                        onChange={handleFormChange}
                                        className="w-full border rounded-md px-3 py-2"
                                        required
                                        disabled={isReadOnly}
                                    >
                                        <option value="">Select Buyer Registration Type</option>
                                        <option value="Registered">Registered</option>
                                        <option value="Unregistered">Unregistered</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">FBR Invoice Ref No</label>
                                    <input
                                        type="text"
                                        name="fbrInvoiceRefNo"
                                        value={invoiceForm.fbrInvoiceRefNo || ''}
                                        onChange={handleFormChange}
                                        className="w-full border rounded-md px-3 py-2"
                                        placeholder="Enter FBR Invoice Ref No"
                                        readOnly={isReadOnly}
                                    />
                                </div>

                            </div>
                            {/* <div className="bg-white rounded-xl shadow overflow-x-auto custom-scroll mt-6">
                                <table className="w-full text-sm min-w-max">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">HS Code</th>
                                            <th className="px-4 py-3 font-semibold">Description</th>
                                            <th className="px-4 py-3 font-semibold">Qty</th>
                                            <th className="px-4 py-3 font-semibold">Rate</th>
                                            <th className="px-4 py-3 font-semibold">Unit</th>
                                            <th className="px-4 py-3 font-semibold">Total Values</th>
                                            <th className="px-4 py-3 font-semibold">Value Sales Excl. ST</th>
                                            <th className="px-4 py-3 font-semibold">Fixed Notified / Retail Price</th>
                                            <th className="px-4 py-3 font-semibold">Sales Tax Applicable</th>
                                            <th className="px-4 py-3 font-semibold">Sales Tax Withheld</th>
                                            <th className="px-4 py-3 font-semibold">Extra Tax</th>
                                            <th className="px-4 py-3 font-semibold">Further Tax</th>
                                            <th className="px-4 py-3 font-semibold">SRO Schedule No</th>
                                            <th className="px-4 py-3 font-semibold">FED Payable</th>
                                            <th className="px-4 py-3 font-semibold">Discount</th>
                                            <th className="px-4 py-3 font-semibold">Sale Type</th>
                                            <th className="px-4 py-3 font-semibold">SRO Item Serial No</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-white">
                                            <td className="px-4 py-3 whitespace-nowrap"><input name="hsCode" value={invoiceForm.hsCode} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input name="description" value={invoiceForm.description} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input type="number" name="qty" value={invoiceForm.qty} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input type="number" name="rate" value={invoiceForm.rate} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input name="unit" value={invoiceForm.unit} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input type="number" name="totalValues" value={invoiceForm.totalValues} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input type="number" name="valueSalesExcludingST" value={invoiceForm.valueSalesExcludingST} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input type="number" name="fixedNotifiedValueOrRetailPrice" value={invoiceForm.fixedNotifiedValueOrRetailPrice} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input type="number" name="salesTaxApplicable" value={invoiceForm.salesTaxApplicable} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input type="number" name="salesTaxWithheldAtSource" value={invoiceForm.salesTaxWithheldAtSource} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input type="number" name="extraTax" value={invoiceForm.extraTax} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input type="number" name="furtherTax" value={invoiceForm.furtherTax} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input name="sroScheduleNo" value={invoiceForm.sroScheduleNo} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input type="number" name="fedPayable" value={invoiceForm.fedPayable} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input type="number" name="discount" value={invoiceForm.discount} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input name="TransactionType" value={invoiceForm.TransactionType} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /><input type="hidden" name="TransactionTypeId" value={invoiceForm.TransactionTypeId || 0} /></td>
                                            <td className="px-4 py-3 whitespace-nowrap"><input name="sroItemSerialNo" value={invoiceForm.sroItemSerialNo} onChange={handleFormChange} className="w-full border rounded px-2 py-1" /></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div> */}
                            <div className="relative bg-white rounded-xl shadow overflow-x-auto custom-scroll mt-6" style={{ minHeight: "500px", maxHeight: "500px", overflowY: "auto" }}>
                                <table className="w-full text-sm min-w-max">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">HS Code</th>
                                            <th className="px-4 py-3 font-semibold">Description</th>
                                            <th className="px-4 py-3 font-semibold">Single Unit Price</th>
                                            <th className="px-4 py-3 font-semibold">Qty</th>
                                            <th className="px-4 py-3 font-semibold">Transaction Type</th>
                                            <th className="px-4 py-3 font-semibold">Rate</th>
                                            <th className="px-4 py-3 font-semibold">Unit</th>
                                            <th className="px-4 py-3 font-semibold">Total Values</th>
                                            <th className="px-4 py-3 font-semibold">Value Sales Excl. ST</th>
                                            <th className="px-4 py-3 font-semibold">Fixed Notified / Retail Price</th>
                                            <th className="px-4 py-3 font-semibold">Sales Tax Applicable</th>
                                            <th className="px-4 py-3 font-semibold">Sales Tax Withheld</th>
                                            <th className="px-4 py-3 font-semibold">Extra Tax</th>
                                            <th className="px-4 py-3 font-semibold">Further Tax</th>
                                            <th className="px-4 py-3 font-semibold">SRO Schedule No</th>
                                            <th className="px-4 py-3 font-semibold">FED Payable</th>
                                            <th className="px-4 py-3 font-semibold">Discount</th>
                                            {/* <th className="px-4 py-3 font-semibold">Sale Type</th> */}
                                            <th className="px-4 py-3 font-semibold">SRO Item Serial No</th>
                                            {/* <th className="px-4 py-3 font-semibold">Actions</th> */}
                                            <th
                                                className="px-4 py-3 font-semibold"
                                                style={{ position: "sticky", right: 0, background: "white", zIndex: 10 }}
                                            >
                                                Remove
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, index) => (
                                            <tr key={index} className="bg-white relative">
                                                {/* HS Code with dropdown */}
                                                <td className="px-4 py-3 whitespace-nowrap relative">
                                                    <input
                                                        type="text"
                                                        value={row.hsCode}
                                                        onChange={(e) => handleInputChange(index, "hsCode", e.target.value)}
                                                        placeholder="Search HS Code..."
                                                        className="w-full border rounded px-2 py-1"
                                                        onFocus={(e) => {
                                                            const dropdown = e.target.nextSibling;
                                                            if (dropdown) dropdown.style.display = "block";
                                                        }}
                                                        onBlur={(e) => {
                                                            const dropdown = e.target.nextSibling;
                                                            setTimeout(() => {
                                                                if (dropdown) dropdown.style.display = "none";
                                                            }, 10);
                                                        }}
                                                        readOnly={isReadOnly}
                                                    />
                                                    <div
                                                        className="absolute top-full left-0 right-0 bg-white border rounded-md max-h-40 overflow-y-auto z-50 shadow-lg"
                                                        style={{ display: "none" }}
                                                    >
                                                        {hsCodes
                                                            .filter((h) =>
                                                                `${h.hS_CODE} - ${h.description}`.toLowerCase().includes(row.hsCode.toLowerCase())
                                                            )
                                                            .map((h) => (
                                                                <div
                                                                    key={h.hS_CODE}
                                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                                    onMouseDown={() => handleInputChange(index, "hsCode", h.hS_CODE)}
                                                                >
                                                                    {h.hS_CODE} - {h.description}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </td>
                                                {/* Description (auto-filled) */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        name="description"
                                                        value={row.description}
                                                        onChange={(e) =>
                                                            handleInputChange(index, "description", e.target.value)
                                                        }
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                    />
                                                </td>
                                                {/* Single Unit Price */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        name="singleUnitPrice"
                                                        // value={row.qty}
                                                        value={row.singleUnitPrice ?? ""}
                                                        // onChange={(e) => handleInputChange(index, "qty", e.target.value)}
                                                        onChange={(e) => {
                                                            if (isReadOnly) return;

                                                            let val = e.target.value;

                                                            const decimalMatch = val.match(/\.(\d*)/);
                                                            const hasDecimal = decimalMatch !== null;
                                                            const decimalDigits = hasDecimal ? decimalMatch[1].length : 0;

                                                            if (decimalDigits > 4) return;

                                                            const cleaned = val
                                                                .replace(/[^0-9.]/g, '')
                                                                .replace(/(\..*?)\./g, '$1');

                                                            handleInputChange(index, "singleUnitPrice", cleaned);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.singleUnitPrice ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "singleUnitPrice", "1");
                                                                return;
                                                            }

                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "singleUnitPrice", num.toString());
                                                            } else {
                                                                handleInputChange(index, "singleUnitPrice", "1");
                                                            }
                                                        }}
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                        inputMode="decimal"
                                                        pattern="[0-9]*\.?[0-9]*"
                                                        placeholder="1.0000"
                                                    />
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        name="qty"
                                                        // value={row.qty}
                                                        value={row.qty ?? ""}
                                                        // onChange={(e) => handleInputChange(index, "qty", e.target.value)}
                                                        onChange={(e) => {
                                                            if (isReadOnly) return;

                                                            let val = e.target.value;

                                                            const decimalMatch = val.match(/\.(\d*)/);
                                                            const hasDecimal = decimalMatch !== null;
                                                            const decimalDigits = hasDecimal ? decimalMatch[1].length : 0;

                                                            if (decimalDigits > 4) return;

                                                            const cleaned = val
                                                                .replace(/[^0-9.]/g, '')
                                                                .replace(/(\..*?)\./g, '$1');

                                                            handleInputChange(index, "qty", cleaned);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.qty ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "qty", "1");
                                                                return;
                                                            }

                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "qty", num.toString());
                                                            } else {
                                                                handleInputChange(index, "qty", "1");
                                                            }
                                                        }}
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                        inputMode="decimal"
                                                        pattern="[0-9]*\.?[0-9]*"
                                                        placeholder="1.0000"
                                                    />
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap relative group">
                                                    <input
                                                        type="text"
                                                        name="TransactionType"
                                                        value={row.TransactionType}
                                                        onChange={(e) => handleInputChange(index, "TransactionType", e.target.value)}
                                                        placeholder="Select Transaction Type..."
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                    />
                                                    <div className="absolute top-full left-0 right-0 bg-white border rounded-md max-h-40 overflow-y-auto z-50 shadow-lg hidden group-focus-within:block">
                                                        {transTypeList
                                                            .filter((u) =>
                                                                u.transactioN_DESC.toLowerCase().includes((row.transType || "").toLowerCase())
                                                            )
                                                            .map((u) => (
                                                                <div
                                                                    key={u.transactioN_TYPE_ID}
                                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                                    onMouseDown={() => { handleInputChange(index, "TransactionTypeId", u.transactioN_TYPE_ID); handleInputChange(index, "TransactionType", u.transactioN_DESC); }}
                                                                >
                                                                    {u.transactioN_DESC}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </td>


                                                {/* Rate */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {row.rateOptions && row.rateOptions.length > 0 ? (
                                                        <select
                                                            value={row.rateId ?? ""}
                                                            onChange={(e) => handleInputChange(index, "rateId", e.target.value)}
                                                            className="w-full border rounded px-2 py-1"
                                                            disabled={isReadOnly}
                                                        >
                                                            <option value="">Select Rate</option>
                                                            {row.rateOptions.map((opt) => (
                                                                <option key={opt.ratE_ID ?? opt.ratE_VALUE ?? opt.ratE_DESC} value={opt.ratE_ID ?? opt.ratE_VALUE}>
                                                                    {opt.ratE_DESC ?? String(opt.ratE_VALUE ?? opt.ratE_ID)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            name="rate"
                                                            value={row.rate ?? ""}
                                                            onChange={(e) => handleInputChange(index, "rate", e.target.value)}
                                                            className="w-full border rounded px-2 py-1"
                                                            readOnly
                                                        />
                                                    )}

                                                    {/* Hidden inputs to keep IDs & descriptions present in the DOM/form */}
                                                    <input type="hidden" name={`rows[${index}].rateId`} value={row.rateId ?? 0} />
                                                    <input type="hidden" name={`rows[${index}].rateDesc`} value={row.rateDesc ?? ''} />
                                                    <input type="hidden" name={`rows[${index}].TransactionTypeId`} value={row.TransactionTypeId ?? 0} />
                                                </td>



                                                {/* Unit with dropdown */}
                                                <td className="px-4 py-3 whitespace-nowrap relative group">
                                                    <input
                                                        type="text"
                                                        name="unit"
                                                        value={row.unit}
                                                        onChange={(e) => handleInputChange(index, "unit", e.target.value)}
                                                        placeholder="Select UOM..."
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                    />
                                                    <div className="absolute top-full left-0 right-0 bg-white border rounded-md max-h-40 overflow-y-auto z-50 shadow-lg hidden group-focus-within:block">
                                                        {uomList
                                                            .filter((u) =>
                                                                u.description.toLowerCase().includes((row.unit || "").toLowerCase())
                                                            )
                                                            .map((u) => (
                                                                <div
                                                                    key={u.uom_ID}
                                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                                    onMouseDown={() => handleInputChange(index, "unit", u.description)}
                                                                >
                                                                    {u.description}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </td>

                                                {/* Total Values */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        name="totalValues"
                                                        value={row.totalValues}
                                                        // value={
                                                        //     (() => {
                                                        //         const price = Number(row.singleUnitPrice) || 0;
                                                        //         const quantity = Number(row.qty) || 0;
                                                        //         const discount = Number(row.discount) || 0;
                                                        //         const fnvrp = Number(row.fixedNotifiedValueOrRetailPrice) || 0;

                                                        //         const effectiveUnitPrice = Math.max(price, fnvrp);
                                                        //         const subtotal = effectiveUnitPrice * quantity;
                                                        //         const netValue = Math.max(0, subtotal - discount);

                                                        //         const rate = Number(row.rate) || 18;
                                                        //         const salesTaxApplicable = netValue * (rate / 100);

                                                        //         const salesTaxWithheld = Number(row.salesTaxWithheldAtSource) || 0;
                                                        //         const extraTaxAmount = Number(row.extraTax) || 0;
                                                        //         const furtherTaxAmount = Number(row.furtherTax) || 0;
                                                        //         const federalExciseDuty = Number(row.fedPayable) || 0;
                                                        //         //const salesTaxApplicable = Number(row.salesTaxApplicable) || 0;

                                                        //         const grandTotal =
                                                        //             netValue +
                                                        //             salesTaxWithheld +
                                                        //             extraTaxAmount +
                                                        //             furtherTaxAmount +
                                                        //             federalExciseDuty +
                                                        //             salesTaxApplicable;

                                                        //         return grandTotal.toFixed(2);
                                                        //     })()
                                                        // }
                                                        // value={(() => {
                                                        //     const price = Number(row.singleUnitPrice) || 0;
                                                        //     const quantity = Number(row.qty) || 0;
                                                        //     const discount = Number(row.discount) || 0;
                                                        //     const fnvrp = Number(row.fixedNotifiedValueOrRetailPrice) || 0;

                                                        //     const effectiveUnitPrice = Math.max(price, fnvrp);
                                                        //     const subtotal = effectiveUnitPrice * quantity;
                                                        //     const netValue = Math.max(0, subtotal - discount);

                                                        //     /* ===== FIX STARTS HERE ===== */
                                                        //     let salesTaxApplicable = 0;
                                                        //     const desc =
                                                        //         (row.rateOptions?.find(
                                                        //             opt => String(opt.ratE_VALUE ?? opt.ratE_ID) === String(row.rate)
                                                        //         )?.ratE_DESC || "")
                                                        //             .toLowerCase()
                                                        //             .trim();
                                                        //     //const desc = (row.rate || "").toLowerCase().trim();
                                                        //     console.log("Parsing rate description for sales tax:", desc);
                                                        //     // Except / DTRE
                                                        //     if (desc.includes("except") || desc.includes("dtre")) {
                                                        //         salesTaxApplicable = 0;
                                                        //     }

                                                        //     // Percentage (16%, 18.6%)
                                                        //     const percentMatch = desc.match(/(\d+(\.\d+)?)\s*%/);
                                                        //     if (percentMatch) {
                                                        //         salesTaxApplicable += netValue * (parseFloat(percentMatch[1]) / 100);
                                                        //     }

                                                        //     // Rs.X per unit (KG / MT / SqY)
                                                        //     const perUnitMatch = desc.match(/rs\.?\s*(\d+)\s*\/\s*(kg|mt|sqy)/);
                                                        //     if (perUnitMatch) {
                                                        //         salesTaxApplicable += quantity * Number(perUnitMatch[1]);
                                                        //     }

                                                        //     // "along with rupees X per kilogram"
                                                        //     const alongWithMatch = desc.match(/rupees\s*(\d+)\s*per\s*kilogram/);
                                                        //     if (alongWithMatch) {
                                                        //         salesTaxApplicable += quantity * Number(alongWithMatch[1]);
                                                        //     }

                                                        //     // Fixed Rs.X
                                                        //     const fixedRsMatch = desc.match(/^rs\.?\s*(\d+)$/);

                                                        //     if (fixedRsMatch) {
                                                        //         console.log("Fixed Rs match found:", fixedRsMatch);
                                                        //         salesTaxApplicable += Number(fixedRsMatch[1]);
                                                        //     }

                                                        //     // X/bill
                                                        //     const perBillMatch = desc.match(/(\d+)\s*\/\s*bill/);
                                                        //     if (perBillMatch) {
                                                        //         salesTaxApplicable += Number(perBillMatch[1]);
                                                        //     }
                                                        //     /* ===== FIX ENDS HERE ===== */

                                                        //     const salesTaxWithheld = Number(row.salesTaxWithheldAtSource) || 0;
                                                        //     const extraTaxAmount = Number(row.extraTax) || 0;
                                                        //     const furtherTaxAmount = Number(row.furtherTax) || 0;
                                                        //     const federalExciseDuty = Number(row.fedPayable) || 0;

                                                        //     const grandTotal =
                                                        //         netValue +
                                                        //         salesTaxApplicable +
                                                        //         salesTaxWithheld +
                                                        //         extraTaxAmount +
                                                        //         furtherTaxAmount +
                                                        //         federalExciseDuty;
                                                        //     handleInputChange(index, "totalValues", grandTotal.toFixed(2))
                                                        //     return grandTotal.toFixed(2);
                                                        // })()}
                                                        // onChange={(e) =>
                                                        //     handleInputChange(index, "totalValues", e.target.value)
                                                        // }
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly
                                                    />
                                                </td>


                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        name="valueSalesExcludingST"
                                                        value={row.valueSalesExcludingST}
                                                        // onChange={(e) =>
                                                        //     handleInputChange(index, "valueSalesExcludingST", e.target.value)
                                                        // }
                                                        // value={
                                                        //     (() => {
                                                        //         const price = Number(row.singleUnitPrice) || 0;
                                                        //         const quantity = Number(row.qty) || 0;
                                                        //         const discount = Number(row.discount) || 0;
                                                        //         const fnvrp = Number(row.fixedNotifiedValueOrRetailPrice) || 0;

                                                        //         //const subtotal = price * quantity;
                                                        //         const effectiveUnitPrice = Math.max(price, fnvrp);
                                                        //         const subtotal = effectiveUnitPrice * quantity;
                                                        //         const netValue = subtotal - discount;

                                                        //         return netValue.toFixed(2);
                                                        //     })()
                                                        // }
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly
                                                    />
                                                </td>

                                                {/* <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        name="fixedNotifiedValueOrRetailPrice"
                                                        value={row.fixedNotifiedValueOrRetailPrice}
                                                        onChange={(e) =>
                                                            handleInputChange(index, "fixedNotifiedValueOrRetailPrice", e.target.value)
                                                        }
                                                        className="w-full border rounded px-2 py-1"
                                                    />
                                                </td> */}

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        name="fixedNotifiedValueOrRetailPrice"
                                                        // value={row.qty}
                                                        value={row.fixedNotifiedValueOrRetailPrice ?? ""}
                                                        // onChange={(e) => handleInputChange(index, "qty", e.target.value)}
                                                        onChange={(e) => {
                                                            if (isReadOnly) return;

                                                            let val = e.target.value;

                                                            const decimalMatch = val.match(/\.(\d*)/);
                                                            const hasDecimal = decimalMatch !== null;
                                                            const decimalDigits = hasDecimal ? decimalMatch[1].length : 0;

                                                            if (decimalDigits > 4) return;

                                                            const cleaned = val
                                                                .replace(/[^0-9.]/g, '')
                                                                .replace(/(\..*?)\./g, '$1');

                                                            handleInputChange(index, "fixedNotifiedValueOrRetailPrice", cleaned);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.fixedNotifiedValueOrRetailPrice ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "fixedNotifiedValueOrRetailPrice", "1");
                                                                return;
                                                            }
                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "fixedNotifiedValueOrRetailPrice", num.toString());
                                                            } else {
                                                                handleInputChange(index, "fixedNotifiedValueOrRetailPrice", "1");
                                                            }
                                                        }}
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                        inputMode="decimal"
                                                        pattern="[0-9]*\.?[0-9]*"
                                                        placeholder="1.0000"
                                                    />
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        name="salesTaxApplicable"
                                                        value={row.salesTaxApplicable}
                                                        // onChange={(e) =>
                                                        //     handleInputChange(index, "salesTaxApplicable", e.target.value)
                                                        // }
                                                        // value={(() => {
                                                        //     const price = Number(row.singleUnitPrice) || 0;
                                                        //     const quantity = Number(row.qty) || 0;
                                                        //     const discount = Number(row.discount) || 0;
                                                        //     const fnvrp = Number(row.fixedNotifiedValueOrRetailPrice) || 0;

                                                        //     const effectiveUnitPrice = Math.max(price, fnvrp);
                                                        //     const subtotal = effectiveUnitPrice * quantity;
                                                        //     const netValue = Math.max(0, subtotal - discount);

                                                        //     /* ===== FIX STARTS HERE ===== */
                                                        //     let taxAmount = 0;

                                                        //     const desc =
                                                        //         (row.rateOptions?.find(
                                                        //             opt => String(opt.ratE_VALUE ?? opt.ratE_ID) === String(row.rate)
                                                        //         )?.ratE_DESC || "")
                                                        //             .toLowerCase()
                                                        //             .trim();

                                                        //     // Except / DTRE
                                                        //     if (desc.includes("except") || desc.includes("dtre")) {
                                                        //         return "0.00";
                                                        //     }

                                                        //     // Percentage (16%, 18.6%)
                                                        //     const percentMatch = desc.match(/(\d+(\.\d+)?)\s*%/);
                                                        //     if (percentMatch) {
                                                        //         taxAmount += netValue * (parseFloat(percentMatch[1]) / 100);
                                                        //     }

                                                        //     // Rs.X per unit (KG / MT / SqY)
                                                        //     const perUnitMatch = desc.match(/rs\.?\s*(\d+)\s*\/\s*(kg|mt|sqy)/);
                                                        //     if (perUnitMatch) {
                                                        //         taxAmount += quantity * Number(perUnitMatch[1]);
                                                        //     }

                                                        //     // along with rupees X per kilogram
                                                        //     const alongWithMatch = desc.match(/rupees\s*(\d+)\s*per\s*kilogram/);
                                                        //     if (alongWithMatch) {
                                                        //         taxAmount += quantity * Number(alongWithMatch[1]);
                                                        //     }

                                                        //     // Fixed Rs.X (NOT per unit)
                                                        //     const fixedRsMatch = desc.match(/rs\.?\s*(\d+)/);
                                                        //     if (fixedRsMatch && !desc.includes("/")) {
                                                        //         taxAmount += Number(fixedRsMatch[1]);
                                                        //     }

                                                        //     // X/bill
                                                        //     const perBillMatch = desc.match(/(\d+)\s*\/\s*bill/);
                                                        //     if (perBillMatch) {
                                                        //         taxAmount += Number(perBillMatch[1]);
                                                        //     }
                                                        //     /* ===== FIX ENDS HERE ===== */

                                                        //     return taxAmount.toFixed(2);
                                                        // })()}

                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly
                                                    />
                                                </td>

                                                {/* <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        name="salesTaxWithheldAtSource"
                                                        value={row.salesTaxWithheldAtSource}
                                                        onChange={(e) =>
                                                            handleInputChange(index, "salesTaxWithheldAtSource", e.target.value)
                                                        }
                                                        className="w-full border rounded px-2 py-1"
                                                    />
                                                </td> */}

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        name="salesTaxWithheldAtSource"
                                                        // value={row.qty}
                                                        value={row.salesTaxWithheldAtSource ?? ""}
                                                        // onChange={(e) => handleInputChange(index, "qty", e.target.value)}
                                                        onChange={(e) => {
                                                            if (isReadOnly) return;

                                                            let val = e.target.value;

                                                            const decimalMatch = val.match(/\.(\d*)/);
                                                            const hasDecimal = decimalMatch !== null;
                                                            const decimalDigits = hasDecimal ? decimalMatch[1].length : 0;

                                                            if (decimalDigits > 2) return;

                                                            const cleaned = val
                                                                .replace(/[^0-9.]/g, '')
                                                                .replace(/(\..*?)\./g, '$1');

                                                            handleInputChange(index, "salesTaxWithheldAtSource", cleaned);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.salesTaxWithheldAtSource ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "salesTaxWithheldAtSource", "0");
                                                                return;
                                                            }

                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "salesTaxWithheldAtSource", num.toString());
                                                            } else {
                                                                handleInputChange(index, "salesTaxWithheldAtSource", "0");
                                                            }
                                                        }}
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                        inputMode="decimal"
                                                        pattern="[0-9]*\.?[0-9]*"
                                                        placeholder="0.00"
                                                    />
                                                </td>

                                                {/* <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        name="extraTax"
                                                        value={row.extraTax}
                                                        onChange={(e) => handleInputChange(index, "extraTax", e.target.value)}
                                                        className="w-full border rounded px-2 py-1"
                                                    />
                                                </td> */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        name="extraTax"
                                                        // value={row.qty}
                                                        value={row.extraTax ?? ""}
                                                        // onChange={(e) => handleInputChange(index, "qty", e.target.value)}
                                                        onChange={(e) => {
                                                            if (isReadOnly) return;

                                                            let val = e.target.value;

                                                            const decimalMatch = val.match(/\.(\d*)/);
                                                            const hasDecimal = decimalMatch !== null;
                                                            const decimalDigits = hasDecimal ? decimalMatch[1].length : 0;

                                                            if (decimalDigits > 2) return;

                                                            const cleaned = val
                                                                .replace(/[^0-9.]/g, '')
                                                                .replace(/(\..*?)\./g, '$1');

                                                            handleInputChange(index, "extraTax", cleaned);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.extraTax ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "extraTax", "0");
                                                                return;
                                                            }

                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "extraTax", num.toString());
                                                            } else {
                                                                handleInputChange(index, "extraTax", "0");
                                                            }
                                                        }}
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                        inputMode="decimal"
                                                        pattern="[0-9]*\.?[0-9]*"
                                                        placeholder="0.00"
                                                    />
                                                </td>

                                                {/* <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        name="furtherTax"
                                                        value={row.furtherTax}
                                                        onChange={(e) => handleInputChange(index, "furtherTax", e.target.value)}
                                                        className="w-full border rounded px-2 py-1"
                                                    />
                                                </td> */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        name="furtherTax"
                                                        // value={row.qty}
                                                        value={row.furtherTax ?? ""}
                                                        // onChange={(e) => handleInputChange(index, "qty", e.target.value)}
                                                        onChange={(e) => {
                                                            if (isReadOnly) return;

                                                            let val = e.target.value;

                                                            const decimalMatch = val.match(/\.(\d*)/);
                                                            const hasDecimal = decimalMatch !== null;
                                                            const decimalDigits = hasDecimal ? decimalMatch[1].length : 0;

                                                            // Reject if more than 4 digits after decimal
                                                            if (decimalDigits > 2) return;

                                                            const cleaned = val
                                                                .replace(/[^0-9.]/g, '')
                                                                .replace(/(\..*?)\./g, '$1');

                                                            handleInputChange(index, "furtherTax", cleaned);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.furtherTax ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "furtherTax", "0");
                                                                return;
                                                            }

                                                            // Optional: normalize (remove leading zeros, etc.)
                                                            // e.g. "000.50" → "0.5", ".5" → "0.5"
                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "furtherTax", num.toString());
                                                            } else {
                                                                handleInputChange(index, "furtherTax", "0");
                                                            }
                                                        }}
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                        inputMode="decimal"          // better mobile keyboard (shows decimal key)
                                                        pattern="[0-9]*\.?[0-9]*"    // helps some browsers/mobile validation
                                                        placeholder="0.00"
                                                    />
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {row.sroOptions && row.sroOptions.length > 0 ? (
                                                        <select
                                                            value={row.sroScheduleId ?? ""}
                                                            onChange={(e) => handleInputChange(index, "sroScheduleId", e.target.value)}
                                                            className="w-full border rounded px-2 py-1"
                                                            disabled={isReadOnly}
                                                        >
                                                            <option value="">Select SRO</option>
                                                            {row.sroOptions.map((opt) => {
                                                                const key = opt.sro_id ?? opt.srO_ID ?? opt.id;
                                                                const label = opt.srO_DESC ?? opt.sroScheduleNo ?? String(opt);
                                                                const value = String(key);
                                                                return (
                                                                    <option key={key} value={value}>
                                                                        {label}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            name="sroScheduleNo"
                                                            value={row.sroScheduleNo ?? "not found"}
                                                            onChange={(e) => handleInputChange(index, "sroScheduleNo", e.target.value)}
                                                            className="w-full border rounded px-2 py-1"
                                                            readOnly={isReadOnly}
                                                        />
                                                    )}

                                                    {/* Hidden inputs to keep IDs present */}
                                                    <input type="hidden" name={`rows[${index}].sroScheduleId`} value={row.sroScheduleId ?? ''} />
                                                    <input type="hidden" name={`rows[${index}].sroScheduleNoId`} value={row.sroScheduleNoId ?? ''} />
                                                    <input type="hidden" name={`rows[${index}].sroScheduleNo`} value={row.sroScheduleNo ?? ''} />
                                                </td>


                                                {/* 
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        name="fedPayable"
                                                        value={row.fedPayable}
                                                        onChange={(e) => handleInputChange(index, "fedPayable", e.target.value)}
                                                        className="w-full border rounded px-2 py-1"
                                                    />
                                                </td> */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        name="fedPayable"
                                                        // value={row.qty}
                                                        value={row.fedPayable ?? ""}
                                                        // onChange={(e) => handleInputChange(index, "qty", e.target.value)}
                                                        onChange={(e) => {
                                                            if (isReadOnly) return;

                                                            let val = e.target.value;

                                                            const decimalMatch = val.match(/\.(\d*)/);
                                                            const hasDecimal = decimalMatch !== null;
                                                            const decimalDigits = hasDecimal ? decimalMatch[1].length : 0;

                                                            // Reject if more than 4 digits after decimal
                                                            if (decimalDigits > 2) return;

                                                            const cleaned = val
                                                                .replace(/[^0-9.]/g, '')
                                                                .replace(/(\..*?)\./g, '$1');

                                                            handleInputChange(index, "fedPayable", cleaned);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.fedPayable ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "fedPayable", "0");
                                                                return;
                                                            }

                                                            // Optional: normalize (remove leading zeros, etc.)
                                                            // e.g. "000.50" → "0.5", ".5" → "0.5"
                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "fedPayable", num.toString());
                                                            } else {
                                                                handleInputChange(index, "fedPayable", "0");
                                                            }
                                                        }}
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                        inputMode="decimal"          // better mobile keyboard (shows decimal key)
                                                        pattern="[0-9]*\.?[0-9]*"    // helps some browsers/mobile validation
                                                        placeholder="0.00"
                                                    />
                                                </td>

                                                {/* <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        name="discount"
                                                        value={row.discount}
                                                        onChange={(e) => handleInputChange(index, "discount", e.target.value)}
                                                        className="w-full border rounded px-2 py-1"
                                                    />
                                                </td> */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        name="discount"
                                                        // value={row.qty}
                                                        value={row.discount ?? ""}
                                                        // onChange={(e) => handleInputChange(index, "qty", e.target.value)}
                                                        onChange={(e) => {
                                                            if (isReadOnly) return;

                                                            let val = e.target.value;

                                                            const decimalMatch = val.match(/\.(\d*)/);
                                                            const hasDecimal = decimalMatch !== null;
                                                            const decimalDigits = hasDecimal ? decimalMatch[1].length : 0;

                                                            // Reject if more than 4 digits after decimal
                                                            if (decimalDigits > 4) return;

                                                            const cleaned = val
                                                                .replace(/[^0-9.]/g, '')
                                                                .replace(/(\..*?)\./g, '$1');

                                                            handleInputChange(index, "discount", cleaned);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.discount ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "discount", "0");
                                                                return;
                                                            }

                                                            // Optional: normalize (remove leading zeros, etc.)
                                                            // e.g. "000.50" → "0.5", ".5" → "0.5"
                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "discount", num.toString());
                                                            } else {
                                                                handleInputChange(index, "discount", "0");
                                                            }
                                                        }}
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                        inputMode="decimal"          // better mobile keyboard (shows decimal key)
                                                        pattern="[0-9]*\.?[0-9]*"    // helps some browsers/mobile validation
                                                        placeholder="0.00"
                                                    />
                                                </td>

                                                {/* <td className="px-4 py-3 whitespace-nowrap relative group">
                                                    <input
                                                        type="text"
                                                        name="saleType"
                                                        value={row.saleType}
                                                        onChange={(e) => handleInputChange(index, "saleType", e.target.value)}
                                                        placeholder="Select sale Type..."
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                    />
                                                    <div className="absolute top-full left-0 right-0 bg-white border rounded-md max-h-40 overflow-y-auto z-50 shadow-lg hidden group-focus-within:block">
                                                        {saleTypeList
                                                            .filter((u) =>
                                                                u.docDescription.toLowerCase().includes((row.saleType || "").toLowerCase())
                                                            )
                                                            .map((u) => (
                                                                <div
                                                                    key={u.docTypeId}
                                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                                    onMouseDown={() => handleInputChange(index, "saleType", u.docDescription)}
                                                                >
                                                                    {u.docDescription}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </td> */}

                                                {/* SRO Item dropdown */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {row.sroItemOptions && row.sroItemOptions.length > 0 ? (
                                                        <select
                                                            value={row.sroItemId ?? ''}
                                                            onChange={(e) => handleInputChange(index, 'sroItemId', e.target.value)}
                                                            className="w-full border rounded px-2 py-1"
                                                            disabled={isReadOnly}
                                                        >
                                                            <option value="">Select Item</option>
                                                            {row.sroItemOptions.map(opt => {
                                                                const key = opt.srO_ITEM_ID ?? opt.id;
                                                                return (
                                                                    <option key={key} value={String(key)}>
                                                                        {opt.srO_ITEM_DESC ?? String(opt)}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            name="sroItemSerialNo"
                                                            value={row.sroItemSerialNo ?? ""}
                                                            onChange={(e) => handleInputChange(index, "sroItemSerialNo", e.target.value)}
                                                            className="w-full border rounded px-2 py-1"
                                                            readOnly={isReadOnly}
                                                        />
                                                    )}

                                                    <input type="hidden" name={`rows[${index}].sroItemId`} value={row.sroItemId ?? ''} />
                                                </td>

                                                {/* Remove Button */}
                                                {/* <td className="px-4 py-3 whitespace-nowrap">
                                                    <button
                                                        onClick={() => removeRow(index)}
                                                        className="bg-red-500 text-white px-3 py-1 rounded"
                                                    >
                                                        Remove
                                                    </button>
                                                </td> */}
                                                <td
                                                    className="px-4 py-3 whitespace-nowrap text-center"
                                                    style={{ position: "sticky", right: 0, background: "white", zIndex: 10 }}
                                                >
                                                    <button
                                                        type="button"
                                                        className={`bg-red-500 text-white px-3 py-1 rounded ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        onClick={() => { if (!isReadOnly) removeRow(index); }}
                                                        disabled={isReadOnly}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                                {/* Add Row Button */}
                                <button
                                    type="button"
                                    onClick={addRow}
                                    disabled={isReadOnly}
                                    className={`h-8 px-3 text-sm rounded bg-blue-600 text-white
      ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}
    `}
                                >
                                    Add Row
                                </button>

                                {/* Totals */}
                                <div className="grid grid-cols-3 gap-4 items-center">
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[11px] text-gray-500">Excl. Tax</span>
                                        <span className="text-sm font-medium text-gray-800">
                                            {invoiceForm.exclTax || "0.00"}
                                        </span>
                                    </div>

                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[11px] text-gray-500">Sales Tax</span>
                                        <span className="text-sm font-medium text-gray-800">
                                            {invoiceForm.tax || "0.00"}
                                        </span>
                                    </div>

                                    <div className="flex flex-col leading-tight text-right">
                                        <span className="text-[11px] text-gray-500">Incl. Tax</span>
                                        <span className="text-sm font-semibold text-blue-600">
                                            {invoiceForm.inclTax || "0.00"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow overflow-x-auto custom-scroll">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            {[
                                'Invoice No',
                                'Date',
                                'Customer Name',
                                'CNIC / NTN',
                                'Scenario Code',
                                'FBR INV No',
                                // 'Amount',
                                // 'Sales Tax',
                                // 'Total',
                                'Status',
                                'Action',
                                'Post to FBR',
                                'Delete'
                            ].map(h => (
                                <th key={h} className="px-4 py-3 text-center font-semibold whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={11} className="py-6 text-center">
                                    Loading invoices...
                                </td>
                            </tr>
                        )}

                        {!loading && invoices.length === 0 && (
                            <tr>
                                <td colSpan={11} className="py-6 text-center">
                                    No invoices found
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            invoices.map((inv, idx) => (
                                <tr key={inv.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 text-center">{inv.invoice_no}</td>
                                    <td className="px-4 py-3 text-center">
                                        {inv.invoice_date ? formatDateForInput(inv.invoice_date) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {inv.customer_name || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {inv.ntn_cnic || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {inv.scenario_code}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {inv.fbr_invoice_no || '-'}
                                    </td>
                                    {/* <td className="px-4 py-3 text-center">
                                        {inv.amount || 0}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {inv.sales_tax || 0}
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold">
                                        {inv.total || 0}
                                    </td> */}
                                    <td className="px-4 py-3 text-center">
                                        {getStatusBadge(inv.status)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => handleViewInvoice(inv)} className="text-blue-600 hover:underline text-sm">
                                            View
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {/* Post to FBR - shown only for the first index when status is Pending or Failed */}
                                        {(idx === 0 && (inv.status === 'Pending' || inv.status === 'Failed')) && (
                                            <button
                                                onClick={() => postInvoiceToFBR(inv.id)}
                                                disabled={processingInvoiceId === inv.id}
                                                className={`px-5 py-1 rounded-full text-xs font-semibold ${processingInvoiceId === inv.id ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
                                            >
                                                {processingInvoiceId === inv.id ? 'Posting...' : 'Post'}
                                            </button>
                                        )}
                                    </td>

                                    <td className="px-1 py-3 text-center">
                                        {/* Remove - shown for Pending or Failed (not for Success) */}
                                        {(inv.status === 'Pending' || inv.status === 'Failed') && (
                                            <button
                                                onClick={() => deleteInvoice(inv.id)}
                                                disabled={processingInvoiceId === inv.id}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold rounded text-white ${processingInvoiceId === inv.id ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
                                            >
                                                {processingInvoiceId === inv.id ? 'Removing...' : 'Remove'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="flex justify-between items-center px-4 py-3 border-t">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Prev
                    </button>

                    <span className="text-sm">Page {page}</span>

                    <button
                        disabled={invoices.length < pageSize}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
