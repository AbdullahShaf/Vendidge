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
    const [scenarioCodeToTransactionType, setScenarioCodeToTransactionType] = useState([]);
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
        status: '',
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
    const [hasChanged, setHasChanged] = useState(false);

    const [processingInvoiceId, setProcessingInvoiceId] = useState(null);
    const [selectedError, setSelectedError] = useState(null);
    const [isLoadingError, setIsLoadingError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fields, setFields] = useState([]);

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
        internalSinglePrice: 0,
        internalQty: 0,
        internalUOM: "",
    };

    // generate short unique id for each row to avoid index-shift races in async callbacks
    const genRowId = () => `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const getFbrHeaders = () => {
        const token = sessionStorage.getItem("sellerToken");
        return token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" };
    };

    // useEffect(() => {

    //     console.log("🔥 ACTUAL STATE CHANGED:", invoiceForm.status);

    // }, [invoiceForm?.status]);


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

        async function fetchUserChooseableFields() {
            try {
                const userId = sessionStorage.getItem("userId");
                const res = await fetch(`/api/userChoosableFields?userId=${userId}`);
                const data = await res.json();
                setFields(data);
            } catch (err) {
                console.warn("Failed to fetch userChoosableFields:", err);
            }
        }
        // console.log("hs code ", hsCodes);
        // console.log("uom list ", uomList);
        fetchUserChooseableFields();
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
                    const [hsResponse, uomResponse, transTypeResponse, saleTypeResponse, scenarioCodeToTransactionTypeResponse] = await Promise.all([
                        fetch("/api/fbr/hsCode", { headers }),
                        fetch("/api/fbr/uom", { headers }),
                        fetch("/api/fbr/TransactionType", { headers }),
                        fetch("/api/fbr/saleType", { headers }),
                        fetch("/api/scenarioCodeToTransactionType"),
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
                    if (!scenarioCodeToTransactionTypeResponse.ok) {
                        throw new Error(`Scenario Code to Transaction Type API failed: ${scenarioCodeToTransactionTypeResponse.status}`);
                    }

                    const hsData = await hsResponse.json();
                    const uomData = await uomResponse.json();
                    const transTypeData = await transTypeResponse.json();
                    const saleTypeData = await saleTypeResponse.json();
                    const scenarioCodeToTransactionTypeData = await scenarioCodeToTransactionTypeResponse.json();
                    //    console.log("BEFORE HS codes and UOM data", scenarioCodeToTransactionTypeData);
                    setHsCodes(Array.isArray(hsData) ? hsData : []);
                    setUomList(Array.isArray(uomData) ? uomData : []);
                    setTransTypeList(Array.isArray(transTypeData) ? transTypeData : []);
                    setSaleTypeList(Array.isArray(saleTypeData) ? saleTypeData : []);
                    setScenarioCodeToTransactionType(
                        Array.isArray(scenarioCodeToTransactionTypeData)
                            ? scenarioCodeToTransactionTypeData
                            : (scenarioCodeToTransactionTypeData.scenarioCodeToTransactionType || [])
                    );
                    //  console.log("AFTER HS codes and transTypeData data", transTypeData);
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
    let today;
    let minDate;

    function getMinDate() {
        //  today = new Date().toISOString().split("T")[0];
        // today = new Date().toLocaleDateString('en-CA', {
        //     timeZone: 'Asia/Karachi'
        // });
        // PKT date (server-safe)
        today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Karachi",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());

        // Default minDate = today
        minDate = today;

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

        console.log("Fetching rate for date:", date, "transTypeId:", transTypeId, "provinceCode:", provinceCode);

        if (!date || !transTypeId || !provinceCode) {
            //  console.warn("Missing required params for rate fetch", { date, transTypeId, provinceCode });
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
            // console.log("Date or seller province id missing, skipping rate fetch", invoiceForm.date, invoiceForm.sellerProvinceId);
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
            // console.warn('Missing required params for SRO fetch', { date, rateId, provinceCode });
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
            // console.warn('Missing date or sroId for SRO items fetch');
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
            // console.log("Buyer Type:", invoiceForm.buyerType);
            const value = document.cookie
                .split('; ')
                .find(row => row.startsWith('isProd='))
                ?.split('=')[1];
            console.log("isProd flag from cookies:", value, typeof value);

            const isProd = value === '1';
            console.log("isProd flag after normalize:", isProd, typeof isProd);
            const payload = (() => {
                switch (invoice.scenario_code) {
                    case "SN001":
                        return {
                            invoiceType: invoice.saleType,
                            // invoiceDate: new Date(invoice.invoice_date)
                            //     .toISOString()
                            //     .split("T")[0],
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                    case "SN004":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
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
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            invoiceRefNo: invoice.fbrInvoiceRefNo ?? "",
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
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
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
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
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
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
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            buyerRegistrationType: invoice.buyerType,
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
                            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                            sellerProvince: invoice.sellerProvince,
                            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                            buyerNTNCNIC: invoice.ntn_cnic,
                            buyerBusinessName: invoice.customer_name,
                            buyerProvince: invoice.buyerProvince,
                            buyerAddress: customers.find(c => c.id === invoice.customer_id)?.address || "",
                            buyerRegistrationType: invoice.buyerType,
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
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
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
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
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
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
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                            invoiceDate: formatDateForInput(invoice.invoice_date),
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
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
                    case "SN028":
                        return {
                            invoiceType: invoice.saleType,
                            invoiceDate: formatDateForInput(invoice.invoice_date),
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
                            //scenarioId: invoice.scenario_code,
                            ...(!isProd && { scenarioId: invoice.scenario_code }),
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
            const payloadWithIds = {
                ...payload,
                userId: sessionStorage.getItem("userId"),
                invoiceId: invoiceId,
            };
            const res = await fetch(
                "/api/fbr/postInvoiceToFBR",
                {
                    method: "POST",
                    headers: {
                        ...getFbrHeaders(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payloadWithIds),
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
                data?.fbrResponse?.validationResponse?.error;
            if (message !== undefined && message !== null && message !== "") {
                alert(`Invoice result: ${message}`);
            }
            // if (data?.fbrResponse?.validationResponse?.status === "Invalid") {
            //     await fetch(`/api/invoice-status`, {
            //         method: 'PUT',
            //         headers: {
            //             'Content-Type': 'application/json',
            //         },
            //         body: JSON.stringify({
            //             userId: sessionStorage.getItem("userId"),
            //             id: invoiceId,
            //             fbrInvoiceNo: null,
            //             status: 'Failed',
            //         }),
            //     });
            // } else {
            //     //console.log("Updating invoice status to Success with FBR invoice no:", data?.fbrResponse?.invoiceNumber);
            //     await fetch(`/api/invoice-status`, {
            //         method: 'PUT',
            //         headers: {
            //             'Content-Type': 'application/json',
            //         },
            //         body: JSON.stringify({
            //             userId: sessionStorage.getItem("userId"),
            //             id: invoiceId,
            //             fbrInvoiceNo: data?.fbrResponse?.invoiceNumber || null,
            //             status: 'Success',
            //         }),
            //     });
            // }

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
    const handleErrorClick = async (invoiceId) => {
        setIsLoadingError(invoiceId);
        try {
            // Replace with your actual API endpoint
            const response = await fetch(`/api/invoices-error?id=${invoiceId}`);
            const data = await response.json();

            const rawData = data.errorData;

            const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

            console.log("Parsed error data:", parsed);
            setSelectedError(parsed);
        } catch (e) {
            console.error("Fetch error:", e);
            alert("Failed to load error details.");
        } finally {
            setIsLoadingError(null);
        }
    };
    const getStatusBadge = (status, invId) => {
        const map = {
            Failed: 'bg-red-100 text-red-700 cursor-pointer hover:bg-red-200 border border-red-300',
            Pending: 'bg-yellow-100 text-yellow-700',
            Validated: 'bg-indigo-100 text-indigo-700',
            Success: 'bg-green-100 text-green-700',
            Processing: 'bg-blue-100 text-blue-700',
        };
        // return (
        //     <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
        //         {status}
        //     </span>
        // );
        return (
            <span
                onClick={() => status === 'Failed' ? handleErrorClick(invId) : null}
                className={`px-3 py-1 rounded-full text-xs font-semibold relative ${map[status]}`}
            >
                {status}
                {/* Small loading spinner inside badge if clicking */}
                {(isLoadingError === invId) && status === 'Failed' && (
                    <span className="ml-2 animate-spin inline-block">...</span>
                )}
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
            // console.log("view inv", inv.scenario_code);
            const currentScenario = inv.scenario_code;
            console.log("status", inv.status);
            setInvoiceForm((prev) => ({
                ...prev,
                invoiceNo: inv.invoice_no || '',
                date: formatDateForInput(inv.invoice_date) || '',
                customer: customerDisplay || prev.customer,
                customerId: inv.customer_id || prev.customerId,
                //scenarioCode: inv.scenario_code,
                scenarioCode: currentScenario,
                scenarioCodeId: inv.scenarioCodeId,
                buyerProvince: resolveProvinceDesc(inv.buyerProvince ?? inv.province ?? ''),
                sellerProvince: resolveProvinceDesc(inv.sellerProvince ?? ''),
                sellerProvinceId: inv.sellerProvinceId,
                saleType: inv.saleType,
                //registrationNo: inv.registrationNo || prev.registrationNo,
                buyerType: inv.buyerType,
                // Ensure FBR reference is loaded from whichever column name is present
                fbrInvoiceRefNo: inv.fbrInvoiceRefNo ?? '',
                status: inv.status || '',
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
                        salesTaxApplicable: r.salesTaxApplicable ?? 0,
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
                const enriched = sanitized.map(s => ({ ...s, rowId: s.rowId ?? genRowId(), scenarioCode: currentScenario }));
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
        }
        //else {
        //     // console.log("Form change:", name, value);
        //     setInvoiceForm(prev => ({ ...prev, [name]: value }));
        // }
        else {
            setInvoiceForm(prev => {
                const updatedForm = { ...prev, [name]: value };

                // Clear FBR Invoice Ref No if saleType is changed away from "Debit Note"
                if (name === "saleType" && value !== "Debit Note") {
                    updatedForm.fbrInvoiceRefNo = "";
                }

                return updatedForm;
            });
        }
    };

    const handleInvoiceSubmit = async (e, toValidate = false) => {
        console.log("Submitting invoice...");
        // e.preventDefault();
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        setIsSubmitting(true);
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
        const validateAllInternalValues = () => {
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                const internalQty = parseFloat(r.internalQty || 0);
                const internalPrice = parseFloat(r.internalSinglePrice || 0);
                if (internalQty === 0 && internalPrice === 0) {
                    continue;
                }
                const exclTax = parseFloat(r.valueSalesExcludingST || r.exclTax || 0);

                const calculatedTotal = internalPrice * internalQty;

                if ( Math.abs(calculatedTotal - exclTax) > 0.01) {
                    alert(
                        `Validation Error at Row ${i + 1}:\n` +
                        `Internal Total (${calculatedTotal.toFixed(2)}) does not match Excl. Tax (${exclTax.toFixed(2)})`
                    );
                    return false;
                }
            }
            return true;
        };
        if (!validateAllInternalValues()) {
            setIsSubmitting(false);
            return;
        }
        const userId = sessionStorage.getItem("userId");
        let invoiceToSubmit = {
            userId: Number(userId),
            invoiceNo: invoiceForm.invoiceNo,
            date: invoiceForm.date,
            customer: invoiceForm.customer,
            customerId: invoiceForm.customerId,
            buyerProvince: invoiceForm.buyerProvince,
            sellerProvince: invoiceForm.sellerProvince || sessionStorage.getItem("sellerProvince") || "",
            sellerProvinceId: Number(invoiceForm.sellerProvinceId) || Number(sessionStorage.getItem("sellerProvinceId") || 0),
            sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
            sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
            sellerAddress: sessionStorage.getItem("sellerAddress") || "",
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
                internalQty: Number(row.internalQty) || 0,
                internalSinglePrice: Number(row.internalSinglePrice) || 0,
                internalUOM: row.internalUOM || "",
            })),
        };
        const value = document.cookie
            .split('; ')
            .find(row => row.startsWith('isProd='))
            ?.split('=')[1];
        console.log("isProd flag from cookies:", value, typeof value);

        const isProd = value === '1';

        console.log("Invoice to submit:", invoiceToSubmit);
        // console.log(sessionStorage.getItem("sellerProvince"));
        // console.log(sessionStorage.getItem("sellerBusinessName"));
        // console.log(sessionStorage.getItem("sellerNTNCNIC"));
        // console.log(sessionStorage.getItem("sellerAddress"));
        function isEmpty(value) {
            return value === null || value === undefined || value === "";
        }

        if (
            isEmpty(sessionStorage.getItem("sellerProvince")) ||
            isEmpty(sessionStorage.getItem("sellerBusinessName")) ||
            isEmpty(sessionStorage.getItem("sellerNTNCNIC")) ||
            isEmpty(sessionStorage.getItem("sellerAddress"))
        ) {
            alert("user info is missing, Please add info in Profile Screen");
            return;
        }

        try {
            console.log("isEdit mode ", isEditMode, " editingInvoiceId ", editingInvoiceId);
            if (isEditMode && editingInvoiceId) {

                const res = await fetch('/api/invoices-crud', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...getFbrHeaders() },
                    body: JSON.stringify({
                        invoiceId: editingInvoiceId,
                        toValidate: toValidate,
                        ...invoiceToSubmit,
                    }),
                });

                const data = await res.json();
                //  alert(`${data.message}`);
                if (res.ok) {
                    //setShowForm(false);
                    //  setIsEditMode(false);
                    console.log("ok");
                    setHasChanged(false)
                    setIsReadOnly(false);
                    getMinDate();
                    const newStatus = toValidate ? 'Validated' : 'Pending';
                    setInvoiceForm(prev => ({
                        ...prev,
                        status: newStatus
                    }));
                    //    await fetchInvoices();

                } else {
                    console.log("not ok");
                    console.warn('Error updating invoice:', data);
                    setInvoiceForm(prev => ({
                        ...prev,
                        status: 'Failed'
                    }));
                    //  await fetchInvoices();
                }
                console.log('status', invoiceForm.status);

            } else {

                const res = await fetch("/api/invoices-crud", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...getFbrHeaders() },
                    body: JSON.stringify(invoiceToSubmit),
                });

                const data = await res.json();
                // alert(`${data.message}`);
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
                                internalQty: 0,
                                internalSinglePrice: 0,
                                internalUOM: "",
                            },
                        ],
                    });

                    setRows([{ ...emptyRow, rowId: genRowId() }]);
                    setCustomerSearch("");
                    setScenarioSearch("");
                    setShowForm(false);
                    fetchInvoices();
                    setHasChanged(false);
                    //  console.log("min date from submit to DB");
                    getMinDate();

                } else {
                    console.warn("Error saving invoice:");
                }
            }
        } catch (err) {
            console.warn("Network error:", err);

        } finally {
            setIsSubmitting(false);
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

    const shouldShow = (fieldName, row = null) => {
        const f = fields.find(f => f.name === fieldName);
        if (!f) return true;

        if (f.show === 1) return true;
        if (f.hide === 1) return false;
        if (f.show_if_value === 1) {

            switch (fieldName) {
                case 'SRO Schedule No.':
                    return !!row.sroScheduleNo;
                case 'SRO Item Sr No.':
                    return !!row.sroItemSerialNo;
                case 'Internal UoM':
                    return !!row.internalUOM;
                case 'Internal Single Unit':
                    return !!row.internalSinglePrice;
                case 'Internal Qty':
                    return !!row.internalQty;
                case 'Fixed Notified Value or Retail Price':
                    return !!row.fixedNotifiedValueOrRetailPrice && Number(row.fixedNotifiedValueOrRetailPrice) !== 0;
                case 'Extra Tax':
                    return !!row.extraTax && Number(row.extraTax) !== 0;
                case 'Further Tax':
                    return !!row.furtherTax && Number(row.furtherTax) !== 0;
                case 'Federal Excise Duty':
                    return !!row.fedPayable && Number(row.fedPayable) !== 0;
                case 'Sales Tax With-Held at SOURCE':
                    return !!row.salesTaxWithheldAtSource;
                case 'Seller Name':
                    return sessionStorage.getItem('sellerBusinessName') || '';
                case 'Seller Address':
                    return sessionStorage.getItem('sellerAddress') || '';
                case 'Seller NTN':
                    return sessionStorage.getItem('sellerInvoiceNTN');
                default:
                    return true;
            }
        }
        return true;
    };

    const shouldShowHeader = (fieldName, activeRows) => {
        const f = fields.find(f => f.name === fieldName);
        if (!f) return true;

        if (f.show === 1) return true;
        if (f.hide === 1) return false;
        if (f.show_if_value === 1) {

            return activeRows.find(row => {
                switch (fieldName) {
                    case 'SRO Schedule No.':
                        return !!row.sroScheduleNo;
                    case 'SRO Item Sr No.':
                        return !!row.sroItemSerialNo;
                    case 'Internal UoM':
                        return !!row.internalUOM;
                    case 'Internal Single Unit':
                        return !!row.internalSinglePrice && Number(row.internalSinglePrice) !== 0;
                    case 'Internal Qty':
                        return !!row.internalQty && Number(row.internalQty) !== 0;
                    case 'Fixed Notified Value or Retail Price':
                        return !!row.fixedNotifiedValueOrRetailPrice && Number(row.fixedNotifiedValueOrRetailPrice) !== 0;
                    case 'Extra Tax':
                        return !!row.extraTax && Number(row.extraTax) !== 0;
                    case 'Further Tax':
                        return !!row.furtherTax && Number(row.furtherTax) !== 0;
                    case 'Federal Excise Duty':
                        return !!row.fedPayable && Number(row.fedPayable) !== 0;
                    case 'Discount':
                        return !!row.discount && Number(row.discount) !== 0;
                    case 'Sales Tax With-Held at SOURCE':
                        return !!row.salesTaxWithheldAtSource && Number(row.salesTaxWithheldAtSource) !== 0;
                    default:
                        return false;
                }
            });
        }

        return true;
    };


    const printInvoice = async (targetInvoice) => {
        try {

            const sellerName = sessionStorage.getItem('sellerBusinessName') || '';
            const sellerAddress = sessionStorage.getItem('sellerAddress') || '';
            const sellerNTN = sessionStorage.getItem('sellerNTNCNIC') || '';
            const sellerInvoiceNTN = sessionStorage.getItem('sellerInvoiceNTN');

            const invoiceNo = invoiceForm.invoiceNo || targetInvoice.invoice_no || '';
            const invoiceDate = formatDateForInput(invoiceForm.date || targetInvoice.invoice_date) || '';

            const customerName = invoiceForm.customer.split(' - ')[0] || targetInvoice.customer_name || '';
            // console.log("Print invoice customer name", customerName);
            const isEvent = targetInvoice && targetInvoice.nativeEvent;

            const activeCustomerId = (targetInvoice && !isEvent)
                ? targetInvoice.customer_id
                : invoiceForm.customerId;

            const customerAddress = customers.find(c => c.id === activeCustomerId)?.address || "";
            // const customerAddress = invoiceForm.buyerAddress || '';
            const customerProvince = invoiceForm.buyerProvince || targetInvoice.buyerProvince || '';
            // const customerNTN =
            //     customers.find(c => c.id === invoiceForm.customerId)?.ntn ||
            //     customers.find(c => c.id === invoiceForm.customerId)?.cnic_inc ||
            //     "";
            const customer = customers.find(c => c.id === activeCustomerId);

            const idLabel = customer?.cnic_inc.length === 7 ? "NTN" : "CNIC";
            const idValue = customer?.cnic_inc || "";


            const currency = 'PKR';
            const isProd =
                document.cookie
                    .split('; ')
                    .find(row => row.startsWith('isProd='))
                    ?.split('=')[1] === '1';
            const invoiceMetaLabel = isProd
                ? 'Transaction Type'
                : 'Scenario';
            // console.log("Print invoice transactionType", rows[0]);
            // console.log("Print invoice scenario code", targetInvoice.items);
            let activeRows = [];
            if (targetInvoice && targetInvoice.items) {

                activeRows = typeof targetInvoice.items === 'string'
                    ? JSON.parse(targetInvoice.items)
                    : targetInvoice.items;
            } else {
                activeRows = rows;
            }
            const activeScenarioCode = targetInvoice.scenario_code || invoiceForm.scenarioCode || '';

            const scenarioCodeDescription = scenarioCodes.find(sc => sc.code === activeScenarioCode)?.description || '';
            const invoiceMetaValue = isProd
                ? (activeRows[0]?.TransactionType || '-')
                : `${activeScenarioCode || '-'} - ${scenarioCodeDescription}`;

            const scenarioCode = invoiceForm.scenarioCode || '';
            // console.log("Print scenario code", scenarioCode);
            // console.log("Print sale tax", rows[0].salesTaxApplicable);
            //             const tableRows = activeRows.map((r, index) => `
            //   <tr>
            //     <td style="border:1px solid #000; padding:4px; text-align:center;">${index + 1 || ''}</td>
            //     <td style="border:1px solid #000; padding:4px; text-align:left; line-height:1.5;"><strong>${r.hsCode}</strong> - ${r.description}<br>
            //     <strong>UoM:</strong> ${r.unit || ''}${r.sroScheduleNo || r.sroItemSerialNo ? `<br><strong>SRO Schedule:</strong> 
            //     ${r.sroScheduleNo || ''}<br><strong>SRO ITEM Sr. No:</strong> ${r.sroItemSerialNo || ''}` : ''}</td>
            //     <td style="border:1px solid #000; padding:4px; text-align:center; line-height:1.5;">${formatNumber(r.singleUnitPrice || 0)} X
            //     ${formatNumber(r.qty || 0)} - ${formatNumber(r.discount || 0)}<br><strong>${formatNumber(r.valueSalesExcludingST || 0)}</strong></td>
            //     <td style="border:1px solid #000; padding:4px; text-align:right; line-height:1.5;">${invoiceForm.scenarioCode === 'SN008' ||
            //                     invoiceForm.scenarioCode === 'SN027' ? `${r.rateDesc} on <br>Retail: ${formatNumber(r.fixedNotifiedValueOrRetailPrice || 0)}<br><strong>${formatNumber(r.salesTaxApplicable || 0)}</strong>` : `(${r.rateDesc})<br>${formatNumber(r.salesTaxApplicable || 0)}`}</td>
            //     <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.furtherTax || 0)}</td>
            //     <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.extraTax || 0)}</td>  
            //     <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.fedPayable || 0)}</td>
            //     <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.salesTaxWithheldAtSource || 0)}</td>
            //     <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.totalValues || r.valueInclTax || 0)}</td>
            //     <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.internalQty || 0)}</td>
            //     <td style="border:1px solid #000; padding:4px; text-align:right;">${formatNumber(r.internalSinglePrice || 0)}</td>
            //     <td style="border:1px solid #000; padding:4px; text-align:right;">${r.internalUOM || ''}</td>
            //   </tr>
            // `).join('');
            const footerEnvText = process.env.NEXT_PUBLIC_INVOICE_FOOTER || "No Text from ENV.";
            const tableRows = activeRows.map((r, index) => {

                const isThirdSchedule = activeScenarioCode === 'SN008' || activeScenarioCode === 'SN027';
                const taxRateDisplay = isThirdSchedule
                    ? `${r.rateDesc} on Retail:<br>${formatNumber(r.fixedNotifiedValueOrRetailPrice || 0)}`
                    : `(${r.rateDesc})`;

                return `
    <tr>
        <td style="border:1px solid #000; padding:2px; text-align:center;">${index + 1}</td>
        <td style="border:1px solid #000; padding:2px; text-align:center;">${r.hsCode}</td>
        <td style="border:1px solid #000; padding:2px;">${r.description}</td>
        ${shouldShow('SRO Schedule No.', r) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${r.sroScheduleNo || ''}</td>` : ''}
        ${shouldShow('SRO Item Sr No.', r) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${r.sroItemSerialNo || ''}</td>` : ''}
        <td style="border:1px solid #000; padding:2px; text-align:center;">${r.unit || ''}</td>
        ${shouldShow('Internal UoM', r) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${r.internalUOM || ''}</td>` : ''}

        <td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(r.singleUnitPrice || 0)}</td>
        ${shouldShow('Internal Single Unit', r) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(r.internalSinglePrice || 0)}</td>` : ''}
        <td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(r.qty || 0)}</td>
        ${shouldShow('Internal Qty', r) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(r.internalQty || 0)}</td>` : ''}
        <td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(r.discount || 0)}</td>
        <td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(r.valueSalesExcludingST || 0)}</td>
        ${shouldShow('Fixed Notified Value or Retail Price', r) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(r.fixedNotifiedValueOrRetailPrice || 0)}</td>` : ''}
        <td style="border:1px solid #000; padding:2px; text-align:center; font-size:9px;">
            ${taxRateDisplay}<br><strong>${formatNumber(r.salesTaxApplicable || 0)}</strong>
        </td>
        ${shouldShow('Extra Tax', r) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(r.extraTax || 0)}</td>` : ''}
        ${shouldShow('Further Tax', r) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(r.furtherTax || 0)}</td>` : ''}
        ${shouldShow('Federal Excise Duty', r) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(r.fedPayable || 0)}</td>` : ''}
        ${shouldShow('Sales Tax With-Held at SOURCE', r) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(r.salesTaxWithheldAtSource || 0)}</td>` : ''}
        <td style="border:1px solid #000; padding:2px; text-align:right;"><strong>${formatNumber(r.totalValues || r.valueInclTax || 0)}</strong></td>
    </tr>`;
            }).join('');

            const totalDisc = activeRows.reduce((sum, r) => sum + Number(r.discount || 0), 0);
            const totalQty = activeRows.reduce((sum, r) => sum + Number(r.qty || 0), 0);
            const totalFixednotifiedretailPrice = activeRows.reduce((sum, r) => sum + Number(r.fixedNotifiedValueOrRetailPrice || 0), 0);
            const totalFedPayable = activeRows.reduce((sum, r) => sum + Number(r.fedPayable || 0), 0);
            const totalFurthurTax = activeRows.reduce((sum, r) => sum + Number(r.furtherTax || 0), 0);
            const totalExtraTax = activeRows.reduce((sum, r) => sum + Number(r.extraTax || 0), 0);
            const totalSalesTaxWithheldAtSource = activeRows.reduce((sum, r) => sum + Number(r.salesTaxWithheldAtSource || 0), 0);
            const totalExclTax = activeRows.reduce((sum, r) => sum + Number(r.valueSalesExcludingST || 0), 0);
            const totalSaleTaxApplicable = activeRows.reduce((sum, r) => sum + Number(r.salesTaxApplicable || 0), 0);
            const totalTax = activeRows.reduce((sum, r) => sum + Number(r.salesTaxApplicable || 0), 0)
                + activeRows.reduce((sum, r) => sum + Number(r.salesTaxWithheldAtSource || 0), 0) + activeRows.reduce((sum, r) => sum + Number(r.extraTax || 0), 0) +
                activeRows.reduce((sum, r) => sum + Number(r.furtherTax || 0), 0) + activeRows.reduce((sum, r) => sum + Number(r.fedPayable || 0), 0);
            // console.log("total tax ", totalTax);
            const totalInclTax = totalExclTax + totalTax;

            const totalInternalQty = activeRows.reduce((sum, r) => sum + Number(r.internalQty || 0), 0);
            const totalInternalSingleUnitPrice = activeRows.reduce((sum, r) => sum + Number(r.internalSinglePrice || 0), 0);
            const totalSingleUnitPrice = activeRows.reduce((sum, r) => sum + Number(r.singleUnitPrice || 0), 0);

            const fbrInvoiceNo = (targetInvoice && !isEvent)
                ? targetInvoice.fbr_invoice_no
                : (invoices.find(inv => inv.invoice_no === invoiceForm.invoiceNo)?.fbr_invoice_no || '');

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


            let visibleColsBeforeQty = 3;
            if (shouldShowHeader('SRO Schedule No.', activeRows)) visibleColsBeforeQty++;
            if (shouldShowHeader('SRO Item Sr No.', activeRows)) visibleColsBeforeQty++;
            visibleColsBeforeQty++;
            if (shouldShowHeader('Internal UoM', activeRows)) visibleColsBeforeQty++;
            visibleColsBeforeQty++;
            if (shouldShowHeader('Internal Single Unit', activeRows)) visibleColsBeforeQty++;

            const savedOrientation = localStorage.getItem("userPrintOrientation") || "landscape";
            let headerHeight = 0;

            if (shouldShow('Seller Name')) headerHeight += 25;
            if (shouldShow('Seller Address')) headerHeight += 20;
            if (shouldShow('Seller NTN')) headerHeight += 20;
            headerHeight += 40;
            headerHeight += 10;

            const printContent = `
<style>
    @media print {
        @page {
           size: A4 ${savedOrientation} !important;
            margin: 10mm;
        }
        html, body {
            margin: 0;
            padding: 0;
        }
       
        .master-table {
            width: 100%;
            border-collapse: collapse;
        }
       .header-spacer { height: ${headerHeight}px; }

        .footer-spacer { height: 50px; }

        .header-fixed {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: ${headerHeight - 5}px;
            background: white;
            z-index: 2000;
        }
        .footer-fixed {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 45px;
            background: white;      
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            z-index: 2000;
            font-size: 12px
        }
        .page-counter-display::after {
            font-weight: bold;
        }
        tr { page-break-inside: avoid !important; }
        thead { display: table-header-group !important; }
    }
    @media screen {
        .header-fixed, .footer-fixed { display: none; }
    }
</style>

<div class="header-fixed">
    <div style="text-align:center; font-weight:bold; font-size:16px; margin-top:5px;">
         ${shouldShow('Seller Name') ? `${sellerName.toUpperCase()}` : ''}
    </div>
    <div style="text-align:center; font-size:11px;">
          ${shouldShow('Seller Address') ? `${sellerAddress.toUpperCase()}` : ''}
    </div>
    <div style="text-align:center; font-size:11px; margin-bottom:12px;">
        ${shouldShow('Seller NTN') ? `NTN No. ${sellerInvoiceNTN}` : ''}
    </div>
    <div style="text-align:center; font-weight:bold; font-size:14px; padding: 6px 0; margin: 0 10px; position: relative;">
        SALES TAX INVOICE
        <span class="page-counter-display" style="position: absolute; right: 10px; font-size: 10px;"></span>
    </div>
</div>

<div class="footer-fixed">
    <span style="padding-left:15px; font-style: italic;">${footerEnvText}</span>
    <span class="page-counter-display" style="padding-right:15px; font-weight:bold;"></span>
</div>

<table class="master-table">
    <thead>
        <tr><td><div class="header-spacer">&nbsp;</div></td></tr>
    </thead>
    <tbody>
        <tr><td>
            <div style="font-family: Arial, sans-serif; font-size: 11px; padding: 0 10px;">
                
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
                                <tr><td><strong>Buyer Type</strong></td><td>${(targetInvoice && !targetInvoice.nativeEvent ? targetInvoice.buyerType : invoiceForm.buyerType) || ''}</td></tr>
                                <tr><td><strong>Currency</strong></td><td>${currency || 'PKR'}</td></tr>
                                <tr><td><strong>${invoiceMetaLabel}</strong></td><td>${invoiceMetaValue}</td></tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:12px; border:1px solid #000;">
                    <thead style="background:#d9d9d9; font-weight:bold;">
                        <tr>
                            <th style="border:1px solid #000; padding:2px; width:2%; text-align:center;">Sr No.</th>
                            <th style="border:1px solid #000; padding:2px; width:4%; text-align:center;">HS Code</th>
                            <th style="border:1px solid #000; padding:2px; width:13%; text-align:left;">Product Description</th>
                            ${shouldShowHeader('SRO Schedule No.', activeRows) ? `<th style="border:1px solid #000; padding:2px; width:5%; text-align:center;">SRO Schedule No.</th>` : ''}
                            ${shouldShowHeader('SRO Item Sr No.', activeRows) ? `<th style="border:1px solid #000; padding:2px; width:5%; text-align:center;">SRO Item Sr No.</th>` : ''}
                            <th style="border:1px solid #000; padding:2px; width:6%; text-align:center;">FBR UoM</th>
                            ${shouldShowHeader('Internal UoM', activeRows) ? `<th style="border:1px solid #000; padding:2px; width:3%; text-align:center;">Int. UOM</th>` : ''}
                            <th style="border:1px solid #000; padding:2px; width:5%; text-align:center;">FBR Price</th>
                            ${shouldShowHeader('Internal Single Unit', activeRows) ? `<th style="border:1px solid #000; padding:2px; width:3%; text-align:center;">Int. Price</th>` : ''}
                            <th style="border:1px solid #000; padding:2px; width:5%; text-align:center;">FBR Qty</th>
                            ${shouldShowHeader('Internal Qty', activeRows) ? `<th style="border:1px solid #000; padding:2px; width:4%; text-align:center;">Int. Qty</th>` : ''}
                            <th style="border:1px solid #000; padding:2px; width:3%; text-align:center;">Discount</th>
                            <th style="border:1px solid #000; padding:2px; width:8%; text-align:center;">Excl. Tax</th>
                            ${shouldShowHeader('Fixed Notified Value or Retail Price', activeRows) ? `<th style="border:1px solid #000; padding:2px; width:5%; text-align:center;">Retail Price</th>` : ''}
                            <th style="border:1px solid #000; padding:2px; width:6%; text-align:center;">Sales Tax</th>
                            ${shouldShowHeader('Extra Tax', activeRows) ? `<th style="border:1px solid #000; padding:2px; width:3%; text-align:center;">Extra Tax</th>` : ''}
                            ${shouldShowHeader('Further Tax', activeRows) ? `<th style="border:1px solid #000; padding:2px; width:3%; text-align:center;">Further Tax</th>` : ''}
                            ${shouldShowHeader('Federal Excise Duty', activeRows) ? `<th style="border:1px solid #000; padding:2px; width:3%; text-align:center;">FED</th>` : ''}
                            ${shouldShowHeader('Sales Tax With-Held at SOURCE', activeRows) ? `<th style="border:1px solid #000; padding:2px; width:3%; text-align:center;">STWH</th>` : ''}   
                            <th style="border:1px solid #000; padding:2px; width:10%; text-align:right;">Total Incl. Tax</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                        <tr style="font-weight:bold; background:#f2f2f2;">
                            <td colspan="${visibleColsBeforeQty}" style="border:1px solid #000; padding:6px; text-align:right;">Total Values</td>
                            <td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(totalQty)}</td>
                            ${shouldShowHeader('Internal Qty', activeRows) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(totalInternalQty)}</td>` : ''}
                            <td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(totalDisc)}</td>
                            <td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(totalExclTax)}</td>
                            ${shouldShowHeader('Fixed Notified Value or Retail Price', activeRows) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(totalFixednotifiedretailPrice)}</td>` : ''}
                            <td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(totalSaleTaxApplicable)}</td>
                            ${shouldShowHeader('Further Tax', activeRows) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(totalFurthurTax)}</td>` : ''}
                            ${shouldShowHeader('Extra Tax', activeRows) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(totalExtraTax)}</td>` : ''}
                            ${shouldShowHeader('Federal Excise Duty', activeRows) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(totalFedPayable)}</td>` : ''}
                            ${shouldShowHeader('Sales Tax With-Held at SOURCE', activeRows) ? `<td style="border:1px solid #000; padding:2px; text-align:center;">${formatNumber(totalSalesTaxWithheldAtSource)}</td>` : ''}
                            <td style="border:1px solid #000; padding:2px; text-align:right;">${formatNumber(totalInclTax)}</td>
                        </tr>
                    </tbody>
                </table>

                ${fbrInvoiceNo ? `
                <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px; margin-top:10px; width:100%; page-break-inside: avoid;">
                    <div><strong>FBR INVOICE #:</strong> ${fbrInvoiceNo}</div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <img id="fbr-qr" src="${qrCodeUrl}" width="80" height="80" alt="QR" />
                        <img id="fbr-logo" src="${fbrLogoUrl}" width="80" height="80" alt="Logo" />
                    </div>
                </div>
                ` : '<p style="text-align:center; font-style:italic;">Note: This Invoice is not verified from FBR</p>'}
            </div>
        </td></tr>
    </tbody>
    <tfoot>
        <tr><td><div class="footer-spacer">&nbsp;</div></td></tr>
    </tfoot>
</table>
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
        //console.log(`Row ${index} change:`, name, value);

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
                console.log("value str", valStr);
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

            const n = (v) => (isNaN(Number(v)) ? 0 : Number(v));

            const price = n(row.singleUnitPrice);
            const quantity = n(row.qty);
            const discount = n(row.discount);
            const fnvrp = n(row.fixedNotifiedValueOrRetailPrice);


            // console.log(invoiceForm.scenarioCode);
            // const isRetailScenario = invoiceForm.scenarioCode === "SN008" || invoiceForm.scenarioCode === "SN027";
            // console.log("handle input invoice scenario", invoiceForm.scenarioCode);
            // console.log("handle input row scenario", row.scenarioCode);

            // const isRetailScenario = row.scenarioCode === "SN008" || row.scenarioCode === "SN027" || invoiceForm.scenarioCode === "SN008" || invoiceForm.scenarioCode === "SN027";
            const currentScenario = row.scenarioCode || invoiceForm.scenarioCode;
            const isRetailScenario = currentScenario === "SN008" || currentScenario === "SN027";
            // console.log(isRetailScenario);

            const valueExclTax = (price * quantity) - discount;
            row.valueSalesExcludingST = Math.max(0, valueExclTax).toFixed(2);

            let taxBaseValue;
            if (isRetailScenario) {

                // taxBaseValue = fnvrp * quantity;
                taxBaseValue = fnvrp;
            } else {
                taxBaseValue = n(row.valueSalesExcludingST);
            }

            let salesTaxApplicable = 0;
            const desc = (
                row.rateOptions?.find(
                    (opt) => String(opt.ratE_VALUE ?? opt.ratE_ID) === String(row.rate)
                )?.ratE_DESC || row.rateDesc || ""
            ).toLowerCase().trim();

            if (!desc.includes("except") && !desc.includes("dtre")) {
                const percentMatch = desc.match(/(\d+(\.\d+)?)\s*%/);
                if (percentMatch) {
                    salesTaxApplicable += taxBaseValue * (parseFloat(percentMatch[1]) / 100);
                }
                //const perUnitMatch = desc.match(/rs\.?\s*(\d+)\s*\/\s*(kg|mt|sqy)/);
                const perUnitMatch = desc.match(/(?:rs\.?\s*)?(\d+)\s*\/\s*(kg|mt|sqy)/i);
                if (perUnitMatch) {
                    salesTaxApplicable += quantity * n(perUnitMatch[1]);
                }

                const alongWithMatch = desc.match(/rupees\s*(\d+)\s*per\s*kilogram/);
                if (alongWithMatch) {
                    salesTaxApplicable += quantity * n(alongWithMatch[1]);
                }

                const fixedRsMatch = desc.match(/^rs\.?\s*(\d+)$/);
                if (fixedRsMatch) {
                    salesTaxApplicable += quantity * n(fixedRsMatch[1]);
                }
                const perBillMatch = desc.match(/(\d+)\s*\/\s*bill/);
                if (perBillMatch) {
                    salesTaxApplicable += n(perBillMatch[1]);
                }
            }
            row.salesTaxApplicable = salesTaxApplicable.toFixed(2);
            //  console.log("sale Tax", row.salesTaxApplicable);
            //  console.log("n(sale tax applicalbe)", n(row.salesTaxApplicable));
            const grandTotal =
                n(row.valueSalesExcludingST) +
                n(row.salesTaxApplicable) +
                n(row.salesTaxWithheldAtSource) +
                n(row.extraTax) +
                n(row.furtherTax) +
                n(row.fedPayable);

            row.totalValues = grandTotal.toFixed(2);

            newRows[index] = row;
            const totalExclTax = newRows.reduce((sum, r) => sum + Number(r.valueSalesExcludingST || 0), 0);
            const totalTax = newRows.reduce((sum, r) => sum + Number(r.salesTaxApplicable || 0), 0);
            const totalInclTax = newRows.reduce((sum, r) => sum + Number(r.totalValues || 0), 0);

            invoiceForm.exclTax = totalExclTax.toFixed(2);
            invoiceForm.tax = totalTax.toFixed(2);
            invoiceForm.inclTax = totalInclTax.toFixed(2);

            setTimeout(() => {
                if (name === "TransactionType" || name === "TransactionTypeId") {
                    fetchSalesTaxRate(index, undefined, row);
                }
                if (name === "rate" || name === "rateId") {
                    fetchSroScheduleOptions(index, row, undefined, invoiceForm.sellerProvinceId ?? invoiceForm.sellerProvince ?? undefined);
                }
                if (name === 'sroScheduleNo' || name === 'sroScheduleId') {
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

    const addRow = () => {
        const newRow = { ...emptyRow, rowId: genRowId() };
        if (invoiceForm.scenarioCode) {
            const mapping = scenarioCodeToTransactionType.find(m =>
                String(m.scenario_code).trim().toUpperCase() === String(invoiceForm.scenarioCode).trim().toUpperCase()
            );
            if (mapping) {
                const targetDesc = mapping.transaction_desc;
                const targetId = transTypeList.find(t => t.transactioN_DESC === targetDesc)?.transactioN_TYPE_ID;
                newRow.TransactionType = targetDesc;
                newRow.TransactionTypeId = targetId || 0;
            }
        }
        const newIndex = rows.length;
        setRows(prev => [...prev, newRow]);
        // Trigger fetch for the new row
        setTimeout(() => fetchSalesTaxRate(newIndex, undefined, newRow), 0);
    };
    const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));


    // const lastMonthDate = new Date();
    // lastMonthDate.setDate(lastMonthDate.getDate() - 30);
    // const minDate = lastMonthDate.toISOString().split("T")[0];

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

    const validateInvoiceDirectly = async (inv) => {
        setProcessingInvoiceId(inv.id);
        try {
            const userId = sessionStorage.getItem("userId");

            // Ensure items are parsed from string to Array to match form behavior
            let itemsArray = [];
            try {
                itemsArray = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
            } catch (e) {
                console.error("Item parsing failed", e);
            }

            // Exact structure of invoiceToSubmit as per your reference
            const invoiceToSubmit = {
                userId: Number(userId),
                invoiceNo: inv.invoice_no,
                date: formatDateForInput(inv.invoice_date),
                customer: inv.customer_name,
                customerId: inv.customer_id,
                buyerProvince: inv.buyerProvince,
                sellerProvince: inv.sellerProvince || sessionStorage.getItem("sellerProvince") || "",
                sellerProvinceId: Number(inv.sellerProvinceId) || Number(sessionStorage.getItem("sellerProvinceId") || 0),
                sellerBusinessName: sessionStorage.getItem("sellerBusinessName") || "",
                sellerNTNCNIC: sessionStorage.getItem("sellerNTNCNIC") || "",
                sellerAddress: sessionStorage.getItem("sellerAddress") || "",
                scenarioCode: inv.scenario_code,
                scenarioCodeId: inv.scenario_code_id,
                saleType: inv.saleType,
                fbrInvoiceRefNo: inv.fbrInvoiceRefNo,
                buyerType: inv.buyerType,
                items: itemsArray.map((row) => ({
                    hsCode: row.hsCode,
                    description: row.description,
                    singleUnitPrice: row.singleUnitPrice,
                    qty: row.qty,
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

            // Exact body structure and order
            const res = await fetch('/api/invoices-crud', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getFbrHeaders() },
                body: JSON.stringify({
                    invoiceId: inv.id,    // Equivalent to editingInvoiceId
                    toValidate: true,      // Equivalent to toValidate
                    ...invoiceToSubmit,   // Spread the object
                }),
            });

            const data = await res.json();
            // alert(`${data.message}`);
            fetchInvoices();
        } catch (err) {
            console.warn("Direct validation error:", err);
        } finally {
            setProcessingInvoiceId(null);
        }
    };

    return (
        <div className="max-w-8xl mx-auto">
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
                                scenarioCode: null,
                                scenarioCodeId: 0,
                                saleType: '',
                                registrationNo: '',
                                items: [{ ...emptyRow, rowId: genRowId() }],
                            });
                            setRows([{ ...emptyRow, rowId: genRowId() }]);
                            setCustomerSearch('');
                            setScenarioSearch('');
                            setHasChanged(false);
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
                                    {/* {(!isReadOnly && hasChanged) && (
                                        <button
                                            type="submit"
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2"
                                        >
                                            <DocumentArrowDownIcon className="h-6 w-6" />
                                            Save
                                        </button>
                                    )} */}
                                    {!isReadOnly && (
                                        <>
                                            {/* Case 1: User made changes -> Show Save (Blue) */}
                                            {hasChanged ? (
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className={`px-4 py-2 rounded-md font-semibold flex items-center gap-2 transition-all 
                                                                 ${isSubmitting
                                                            ? 'bg-gray-400 cursor-not-allowed text-white'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95 shadow-sm'
                                                        }`}
                                                >
                                                    {isSubmitting ? (
                                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : (
                                                        <DocumentArrowDownIcon className="h-6 w-6" />
                                                    )}
                                                    {isSubmitting ? 'Saving...' : 'Save'}
                                                </button>
                                            ) : (

                                                //   (invoiceForm.status === 'Pending' || invoiceForm.status === 'Failed') && (
                                                (invoiceForm.status != 'Validated') && isEditMode && (
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting} // Disable during request
                                                        onClick={() => handleInvoiceSubmit(null, true)}
                                                        className={`px-4 py-2 rounded-md font-semibold flex items-center gap-2 transition-all 
                                                                     ${isSubmitting
                                                                ? 'bg-gray-400 cursor-not-allowed text-white'
                                                                : 'bg-green-600 hover:bg-green-700 text-white active:scale-95'
                                                            }`}
                                                    >
                                                        {isSubmitting ? (
                                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        ) : (
                                                            <DocumentArrowDownIcon className="h-6 w-6" />
                                                        )}
                                                        {isSubmitting ? 'Validating...' : 'Validate'}
                                                    </button>
                                                )
                                            )}
                                            {invoiceForm.status === 'Failed' && (
                                                <button
                                                    type="button"
                                                    disabled={isLoadingError} // Prevent multiple clicks
                                                    onClick={() => handleErrorClick(editingInvoiceId)}
                                                    className={`px-4 py-2 rounded-md font-semibold flex items-center gap-2 transition-all shadow-sm
            ${isLoadingError
                                                            ? 'bg-gray-400 cursor-not-allowed text-white'
                                                            : 'bg-red-600 hover:bg-red-700 text-white active:scale-95'
                                                        }`}
                                                >
                                                    {isLoadingError ? (
                                                        // Simple Spinner SVG
                                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : (
                                                        <DocumentArrowDownIcon className="h-6 w-6" />
                                                    )}

                                                    {isLoadingError ? 'Loading...' : 'View Error Details'}
                                                </button>
                                            )}
                                            {invoiceForm.status === 'Validated' && !hasChanged && (
                                                <span className="px-4 py-2 rounded-md font-semibold flex items-center gap-2 bg-green-600 text-white w-fit">
                                                    {/* Optional: Adds a checkmark icon to match your style */}
                                                    Validation Success
                                                </span>
                                            )}

                                        </>
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
                                            setHasChanged(false);
                                            fetchInvoices();
                                            // setInvoiceForm(null);
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
                                                setHasChanged(true);
                                            }
                                        }}
                                        onBlur={() => {
                                            const canEdit = !isEditMode && Number(latestInvoice) === 1;
                                            if (canEdit && (!invoiceForm.invoiceNo || invoiceForm.invoiceNo === '')) {
                                                setInvoiceForm((prev) => ({ ...prev, invoiceNo: '1' }));
                                                setHasChanged(true);
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
                                        //onChange={handleFormChange}
                                        onChange={(e) => {
                                            handleFormChange(e);
                                            setHasChanged(true);
                                        }}
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
                                        onChange={(e) => { setCustomerSearch(e.target.value); setHasChanged(true); }}
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
                                                            setHasChanged(true);
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
                                            // onChange={()=>handleFormChange}
                                            onChange={(e) => {
                                                handleFormChange(e);
                                                setHasChanged(true);
                                            }}
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
                                            // onChange={handleFormChange}
                                            onChange={(e) => {
                                                handleFormChange(e);
                                                setHasChanged(true);
                                            }}
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
                                {/* <div className="relative w-full group">
                                    <label className="block text-sm font-medium mb-1">Scenario Code</label>

                                    <input
                                        type="text"
                                       // value={scenarioSearch}
                                        value={invoiceForm.scenarioCode ? `${invoiceForm.scenarioCode} - ${scenarioCodes.find(s => s.code === invoiceForm.scenarioCode)?.description}` : ""}
                                        onChange={(e) => { setScenarioSearch(e.target.value); setHasChanged(true); }}
                                        placeholder="Select scenario code..."
                                        className="w-full border rounded-md px-3 py-2"
                                        readOnly={isReadOnly}
                                        required
                                    />

                                    <div className="absolute left-0 right-0 top-full -mt-px bg-white border rounded-md max-h-40 overflow-y-auto z-50 shadow-lg hidden group-focus-within:block">
                                        {scenarioCodes
                                            // .filter((s) =>
                                            //     `${s.code} - ${s.description}`
                                            //         .toLowerCase()
                                            //         .includes(scenarioSearch.toLowerCase())
                                            // )
                                            .map((s) => (
                                                <div
                                                    key={s.id}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                    // onMouseDown={() => {
                                                    //     const value = `${s.code} - ${s.description}`;
                                                    //     setInvoiceForm((prev) => ({
                                                    //         ...prev,
                                                    //         scenarioCodeId: s.id,
                                                    //         scenarioCode: s.code,
                                                    //     }));
                                                    //     setScenarioSearch(value);
                                                    // }}
                                                    onMouseDown={() => {
                                                        // 1. Capture the values from 's' immediately so they are in scope
                                                        const selectedCode = s.code;
                                                        const selectedId = s.id;
                                                        const displayValue = `${s.code} - ${s.description}`;

                                                        //   2. Find the mapped transaction description from your state
                                                        const dataArray = Array.isArray(scenarioCodeToTransactionType)
                                                            ? scenarioCodeToTransactionType
                                                            : scenarioCodeToTransactionType.scenarioCodeToTransactionType; // Access the nested key

                                                        console.log("selected scenario code:", selectedCode);
                                                        console.log("Actual Data Array:", dataArray);

                                                        const mapping = scenarioCodeToTransactionType.find(m =>
                                                            String(m.scenario_code).trim().toUpperCase() === String(selectedCode).trim().toUpperCase()
                                                        );

                                                        console.log("Selected scenario mapping:", mapping);
                                                        // 3. Update the main form (Your existing structure)
                                                        setInvoiceForm((prev) => ({
                                                            ...prev,
                                                            scenarioCodeId: selectedId,
                                                            scenarioCode: selectedCode,
                                                        }));
                                                        //setScenarioSearch(displayValue);
                                                        setHasChanged(true);

                                                        // 4. Auto-update all rows if a mapping is found
                                                        if (mapping) {
                                                            const targetDesc = mapping.transaction_desc;
                                                            // Find the ID from your existing transTypeList
                                                            const targetId = transTypeList.find(t => t.transactioN_DESC === targetDesc)?.transactioN_TYPE_ID;
                                                            // console.log("desc" , targetDesc);
                                                            // console.log("id" , targetId);
                                                            setRows((prevRows) => {
                                                                const updatedRows = prevRows.map((row) => ({
                                                                    ...row,
                                                                    TransactionType: targetDesc,
                                                                    TransactionTypeId: targetId || row.TransactionTypeId,
                                                                }));
                                                                // Trigger fetch for each row with the updated row data
                                                                setTimeout(() => {
                                                                    updatedRows.forEach((row, idx) => fetchSalesTaxRate(idx, undefined, row));
                                                                }, 0);
                                                                return updatedRows;
                                                            });
                                                        }
                                                    }}
                                                >
                                                    {s.code} - {s.description}
                                                </div>
                                            ))}

                                        {/* {scenarioCodes.filter((s) =>
                                            `${s.code} - ${s.description}`
                                                .toLowerCase()
                                                .includes(scenarioSearch.toLowerCase())
                                        ).length === 0 && (
                                                <div className="px-3 py-2 text-gray-400">No scenario found</div>
                                            )} */ /*}
                                    </div>
                                </div> */}
                                <div className="relative w-full group">
                                    <label className="block text-sm font-medium mb-1">Scenario Code</label>

                                    <input
                                        type="text"
                                        value={
                                            invoiceForm.scenarioCode
                                                ? `${invoiceForm.scenarioCode} - ${scenarioCodes.find(
                                                    (s) => s.code === invoiceForm.scenarioCode
                                                )?.description || ""}`
                                                : ""
                                        }
                                        placeholder="Select scenario code..."
                                        className="w-full border rounded-md px-3 py-2 cursor-pointer bg-white"
                                        readOnly={true} // allow click but prevent typing if you want
                                        onClick={(e) => e.currentTarget.focus()} // focus triggers dropdown via group-focus-within
                                        required
                                    />

                                    <div className="absolute left-0 right-0 top-full -mt-px bg-white border rounded-md max-h-40 overflow-y-auto z-50 shadow-lg hidden group-focus-within:block">
                                        {scenarioCodes.map((s) => (
                                            <div
                                                key={s.id}
                                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // prevent input blur
                                                    const selectedCode = s.code;
                                                    const selectedId = s.id;

                                                    // save only code
                                                    setInvoiceForm((prev) => ({
                                                        ...prev,
                                                        scenarioCodeId: selectedId,
                                                        scenarioCode: selectedCode,
                                                    }));
                                                    setHasChanged(true);

                                                    // auto-update rows if mapping exists
                                                    const mapping = scenarioCodeToTransactionType.find(
                                                        (m) =>
                                                            String(m.scenario_code).trim().toUpperCase() ===
                                                            selectedCode.trim().toUpperCase()
                                                    );
                                                    if (mapping) {
                                                        const targetDesc = mapping.transaction_desc;
                                                        const targetId = transTypeList.find(
                                                            (t) => t.transactioN_DESC === targetDesc
                                                        )?.transactioN_TYPE_ID;

                                                        setRows((prevRows) =>
                                                            prevRows.map((row) => ({
                                                                ...row,
                                                                TransactionType: targetDesc,
                                                                TransactionTypeId: targetId || row.TransactionTypeId,
                                                            }))
                                                        );

                                                        setTimeout(() => {
                                                            rows.forEach((row, idx) =>
                                                                fetchSalesTaxRate(idx, undefined, row)
                                                            );
                                                        }, 0);
                                                    }
                                                }}
                                            >
                                                {s.code} - {s.description}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="relative w-full group">
                                    <label className="block text-sm font-medium mb-1">Sale Type</label>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="saleType"
                                            value={invoiceForm.saleType || ""}
                                            onChange={(e) => { handleFormChange(e); setHasChanged(true); }}
                                            placeholder="Select or type sale type..."
                                            className={`
                                                        w-full border rounded px-3 py-2 text-sm
                                                         ${isReadOnly
                                                    ? "bg-gray-50 text-gray-700 cursor-default"
                                                    : "bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"}
                                             `}
                                            readOnly={true}
                                            //  onFocus={(e) => !isReadOnly && e.target.select()}
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
                                                                setHasChanged(true);
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
                                        onChange={(e) => { handleFormChange(e); setHasChanged(true); }}
                                        className="w-full border rounded-md px-3 py-2"
                                        required
                                        disabled={isReadOnly}
                                    >
                                        <option value="">Select Buyer Registration Type</option>
                                        <option value="Registered">Registered</option>
                                        <option value="Unregistered">Unregistered</option>
                                    </select>
                                </div>
                                {invoiceForm.saleType === "Debit Note" && (
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
                                )}

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
                                            <th className="px-4 py-3 font-semibold">Fixed Notified / Retail Price * Qty</th>
                                            <th className="px-4 py-3 font-semibold">Sales Tax Applicable</th>
                                            <th className="px-4 py-3 font-semibold">Sales Tax Withheld</th>
                                            <th className="px-4 py-3 font-semibold">Extra Tax</th>
                                            <th className="px-4 py-3 font-semibold">Further Tax</th>
                                            <th className="px-4 py-3 font-semibold">SRO Schedule No</th>
                                            <th className="px-4 py-3 font-semibold">FED Payable</th>
                                            <th className="px-4 py-3 font-semibold">Discount</th>
                                            {/* <th className="px-4 py-3 font-semibold">Sale Type</th> */}
                                            <th className="px-4 py-3 font-semibold">SRO Item Serial No</th>
                                            <th className="px-4 py-3 font-semibold">Internal Qty</th>
                                            <th className="px-4 py-3 font-semibold">Internal Single Unit Price</th>
                                            <th className="px-4 py-3 font-semibold">Internal UOM</th>
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
                                                        onChange={(e) => { handleInputChange(index, "hsCode", e.target.value); setHasChanged(true); }}
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
                                                                    onMouseDown={() => { handleInputChange(index, "hsCode", h.hS_CODE); setHasChanged(true); }}
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
                                                        onChange={(e) => { handleInputChange(index, "description", e.target.value); setHasChanged(true); }
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
                                                            setHasChanged(true);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.singleUnitPrice ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "singleUnitPrice", "1");
                                                                setHasChanged(true);
                                                                return;
                                                            }

                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "singleUnitPrice", num.toString());
                                                                setHasChanged(true);
                                                            } else {
                                                                handleInputChange(index, "singleUnitPrice", "1");
                                                                setHasChanged(true);
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
                                                            setHasChanged(true);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.qty ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "qty", "1");
                                                                setHasChanged(true);
                                                                return;
                                                            }

                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "qty", num.toString());
                                                                setHasChanged(true);
                                                            } else {
                                                                handleInputChange(index, "qty", "1");
                                                                setHasChanged(true);
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
                                                        onChange={(e) => { handleInputChange(index, "TransactionType", e.target.value); setHasChanged(true); }}
                                                        placeholder="Select Transaction Type..."
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly
                                                    />
                                                    {/* <div className="absolute top-full left-0 right-0 bg-white border rounded-md max-h-40 overflow-y-auto z-50 shadow-lg hidden group-focus-within:block">
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
                                                    </div> */}
                                                </td>


                                                {/* Rate */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {row.rateOptions && row.rateOptions.length > 0 ? (
                                                        <select
                                                            value={row.rateId ?? ""}
                                                            onChange={(e) => { handleInputChange(index, "rateId", e.target.value); setHasChanged(true); }}
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
                                                            onChange={(e) => { handleInputChange(index, "rate", e.target.value); setHasChanged(true); }}
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
                                                        onChange={(e) => { handleInputChange(index, "unit", e.target.value); setHasChanged(true); }}
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
                                                            setHasChanged(true);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.fixedNotifiedValueOrRetailPrice ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "fixedNotifiedValueOrRetailPrice", "0");
                                                                setHasChanged(true);
                                                                return;
                                                            }
                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "fixedNotifiedValueOrRetailPrice", num.toString());
                                                                setHasChanged(true);
                                                            } else {
                                                                handleInputChange(index, "fixedNotifiedValueOrRetailPrice", "0");
                                                                setHasChanged(true);
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
                                                            setHasChanged(true);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.salesTaxWithheldAtSource ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "salesTaxWithheldAtSource", "0");
                                                                setHasChanged(true);
                                                                return;
                                                            }

                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "salesTaxWithheldAtSource", num.toString());
                                                                setHasChanged(true);
                                                            } else {
                                                                handleInputChange(index, "salesTaxWithheldAtSource", "0");
                                                                setHasChanged(true);
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
                                                            setHasChanged(true);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.extraTax ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "extraTax", "0");
                                                                setHasChanged(true);
                                                                return;
                                                            }

                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "extraTax", num.toString());
                                                                setHasChanged(true);
                                                            } else {
                                                                handleInputChange(index, "extraTax", "0");
                                                                setHasChanged(true);
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
                                                            setHasChanged(true);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.furtherTax ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "furtherTax", "0");
                                                                setHasChanged(true);
                                                                return;
                                                            }

                                                            // Optional: normalize (remove leading zeros, etc.)
                                                            // e.g. "000.50" → "0.5", ".5" → "0.5"
                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "furtherTax", num.toString());
                                                                setHasChanged(true);
                                                            } else {
                                                                handleInputChange(index, "furtherTax", "0");
                                                                setHasChanged(true);
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
                                                            onChange={(e) => { handleInputChange(index, "sroScheduleId", e.target.value); setHasChanged(true); }}
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
                                                            onChange={(e) => { handleInputChange(index, "sroScheduleNo", e.target.value); setHasChanged(true); }}
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
                                                            setHasChanged(true);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.fedPayable ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "fedPayable", "0");
                                                                setHasChanged(true);
                                                                return;
                                                            }

                                                            // Optional: normalize (remove leading zeros, etc.)
                                                            // e.g. "000.50" → "0.5", ".5" → "0.5"
                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "fedPayable", num.toString());
                                                                setHasChanged(true);
                                                            } else {
                                                                handleInputChange(index, "fedPayable", "0");
                                                                setHasChanged(true);
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
                                                            setHasChanged(true);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.discount ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "discount", "0");
                                                                setHasChanged(true);
                                                                return;
                                                            }

                                                            // Optional: normalize (remove leading zeros, etc.)
                                                            // e.g. "000.50" → "0.5", ".5" → "0.5"
                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "discount", num.toString());
                                                                setHasChanged(true);
                                                            } else {
                                                                handleInputChange(index, "discount", "0");
                                                                setHasChanged(true);
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
                                                            onChange={(e) => { handleInputChange(index, 'sroItemId', e.target.value); setHasChanged(true); }}
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
                                                            onChange={(e) => { handleInputChange(index, "sroItemSerialNo", e.target.value); setHasChanged(true); }}
                                                            className="w-full border rounded px-2 py-1"
                                                            readOnly={isReadOnly}
                                                        />
                                                    )}

                                                    <input type="hidden" name={`rows[${index}].sroItemId`} value={row.sroItemId ?? ''} />
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        name="internalQty"
                                                        // value={row.qty}
                                                        value={row.internalQty ?? ""}
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

                                                            handleInputChange(index, "internalQty", cleaned);
                                                            setHasChanged(true);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.internalQty ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "internalQty", "0");
                                                                setHasChanged(true);
                                                                return;
                                                            }

                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "internalQty", num.toString());
                                                                setHasChanged(true);
                                                            } else {
                                                                handleInputChange(index, "internalQty", "0");
                                                                setHasChanged(true);
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
                                                        name="internalSinglePrice"
                                                        // value={row.qty}
                                                        value={row.internalSinglePrice ?? ""}
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
                                                                .replace(/(\..*?)\./g, '$0');

                                                            handleInputChange(index, "internalSinglePrice", cleaned);
                                                            setHasChanged(true);
                                                        }}
                                                        onBlur={() => {
                                                            if (isReadOnly) return;

                                                            let current = (row.internalSinglePrice ?? "").trim();

                                                            if (current === "") {
                                                                handleInputChange(index, "internalSinglePrice", "0");
                                                                setHasChanged(true);
                                                                return;
                                                            }

                                                            const num = Number(current);
                                                            if (!isNaN(num) && num >= 0) {
                                                                handleInputChange(index, "internalSinglePrice", num.toString());
                                                                setHasChanged(true);
                                                            } else {
                                                                handleInputChange(index, "internalSinglePrice", "0");
                                                                setHasChanged(true);
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
                                                        name="internalUOM"
                                                        value={row.internalUOM ?? ""}
                                                        onChange={(e) => { handleInputChange(index, "internalUOM", e.target.value); setHasChanged(true); }
                                                        }
                                                        className="w-full border rounded px-2 py-1"
                                                        readOnly={isReadOnly}
                                                    />
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
                                                        onClick={() => { if (!isReadOnly) { removeRow(index); setHasChanged(true); } }}
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
                                    onClick={() => { addRow(); setHasChanged(true); }}
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
                                'Submit',
                                'Delete',
                                'Bill'

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
                                        {/* {getStatusBadge(inv.status)} */}
                                        {processingInvoiceId === inv.id
                                            ? getStatusBadge('Processing', inv.id)
                                            : getStatusBadge(inv.status, inv.id)
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {inv.status !== 'Processing' && (
                                            <button onClick={() => handleViewInvoice(inv)} className="text-blue-600 hover:underline text-sm">
                                                View
                                            </button>
                                        )}
                                    </td>

                                    {/* Post to FBR - shown only for the first index when status is Pending or Failed */}
                                    {/* {(idx === 0 && (inv.status === 'Pending' || inv.status === 'Failed' || inv.status === 'Validated')) && (
                                            <button
                                                //onClick={() => postInvoiceToFBR(inv.id)}
                                                onClick={() => {
                                                    if (inv.status === 'Validated') {
                                                        postInvoiceToFBR(inv.id);
                                                    } else {
                                                        // Direct call to validate without opening form
                                                        validateInvoiceDirectly(inv);
                                                    }
                                                }}
                                                disabled={processingInvoiceId === inv.id}
                                                className={`px-5 py-1 rounded-full text-xs font-semibold ${processingInvoiceId === inv.id ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
                                            >
                                                {processingInvoiceId === inv.id
                                                    ? 'Processing'
                                                    : inv.status === 'Validated' ? 'Post' : 'Validate'
                                                }
                                            </button>
                                        )} */}
                                    {/* Post to FBR / Validate Column */}
                                    <td className="px-1 py-3 w-px whitespace-nowrap">
                                        <div className="flex justify-center items-center">
                                            {/* Post Button */}
                                            {idx === 0 && inv.status === 'Validated' && (
                                                <button
                                                    onClick={() => postInvoiceToFBR(inv.id)}
                                                    disabled={processingInvoiceId === inv.id}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold text-white transition-all
                    ${processingInvoiceId === inv.id
                                                            ? 'bg-gray-400 cursor-not-allowed'
                                                            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                                                        }`}
                                                >
                                                    {processingInvoiceId === inv.id ? 'Wait...' : 'Post to FBR'}
                                                </button>
                                            )}

                                            {/* Validate Button */}
                                            {(inv.status === 'Pending' || inv.status === 'Failed') && (
                                                <button
                                                    onClick={() => validateInvoiceDirectly(inv)}
                                                    disabled={processingInvoiceId === inv.id}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold text-white transition-all
                    ${processingInvoiceId === inv.id
                                                            ? 'bg-gray-400 cursor-not-allowed'
                                                            : 'bg-slate-700 hover:bg-slate-800 active:scale-95'
                                                        }`}
                                                >
                                                    {processingInvoiceId === inv.id ? 'Wait...' : 'Validate'}
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-1 py-3 text-center">
                                        {/* Remove - shown for Pending or Failed (not for Success) */}
                                        {(inv.status === 'Pending' || inv.status === 'Failed' || inv.status === 'Validated') && (
                                            <button
                                                onClick={() => deleteInvoice(inv.id)}
                                                disabled={processingInvoiceId === inv.id}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold rounded text-white ${processingInvoiceId === inv.id ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
                                            >
                                                {processingInvoiceId === inv.id ? 'Removing...' : 'Remove'}
                                            </button>
                                        )}
                                    </td>

                                    {/* <td className="px-1 py-3 text-center">

                                        <button
                                            onClick={() => printInvoice(inv)}
                                            disabled={processingInvoiceId === inv.id}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold rounded text-white ${processingInvoiceId === inv.id ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
                                        >

                                        </button>

                                    </td> */}
                                    <td className="px-1 py-3 text-center">
                                        <button
                                            onClick={() => printInvoice(inv)}
                                            disabled={processingInvoiceId === inv.id}
                                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shadow-sm
            ${processingInvoiceId === inv.id
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 hover:shadow-md'
                                                }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.618 0-1.139-.462-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                                            </svg>

                                            Print
                                        </button>
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
            {selectedError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-200">

                        {/* Header */}
                        <div className="p-5 border-b flex justify-between items-center bg-red-50">
                            <div>
                                <h3 className="text-xl font-bold text-red-800">Validation Errors</h3>
                                <p className="text-sm text-red-600">Please correct the following issues and re-submit.</p>
                            </div>
                            <button
                                onClick={() => setSelectedError(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors text-3xl leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-0 overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-gray-50 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-500 border-b">Item</th>
                                        <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-500 border-b">Code</th>
                                        <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-500 border-b">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {Array.isArray(selectedError) ? (
                                        selectedError.map((err, idx) => (
                                            <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                                                <td className="px-6 py-4 align-top">
                                                    <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded">
                                                        {err.itemSNo || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <code className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                                                        {err.errorCode}
                                                    </code>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-700 leading-relaxed">
                                                    {err.error}
                                                    {err.status === "Invalid" && (
                                                        <span className="ml-2 text-[10px] uppercase font-bold text-orange-500">
                                                            [{err.status}]
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-10 text-center text-gray-500 italic">
                                                No detailed error information available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setSelectedError(null)}
                                className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all active:scale-95 shadow-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
}
