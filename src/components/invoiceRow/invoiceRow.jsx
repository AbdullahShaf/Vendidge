// import React, { memo } from 'react';

// const InvoiceRow = memo(({ 
//     row, 
//     index, 
//     isReadOnly, 
//     handleInputChange, 
//     removeRow, 
//     hsCodes, 
//     uomList, 
//     isRetailScenario 
// }) => {
//     return (
//         <tr className="bg-white relative">
//             {/* HS Code */}
//             <td className="px-4 py-3 whitespace-nowrap relative">
//                 <input
//                     type="text"
//                     value={row.hsCode}
//                     onChange={(e) => handleInputChange(index, "hsCode", e.target.value)}
//                     placeholder="Search HS Code..."
//                     className="w-full border rounded px-2 py-1"
//                     readOnly={isReadOnly}
//                 />
//             </td>

//             {/* Description */}
//             <td className="px-4 py-3 whitespace-nowrap">
//                 <input
//                     value={row.description}
//                     onChange={(e) => handleInputChange(index, "description", e.target.value)}
//                     className="w-full border rounded px-2 py-1"
//                     readOnly={isReadOnly}
//                 />
//             </td>

//             {/* Single Unit Price */}
//             <td className="px-4 py-3 whitespace-nowrap">
//                 <input
//                     type="text"
//                     value={row.singleUnitPrice ?? ""}
//                     onChange={(e) => handleInputChange(index, "singleUnitPrice", e.target.value)}
//                     className="w-full border rounded px-2 py-1"
//                     readOnly={isReadOnly}
//                 />
//             </td>

//             {/* Qty */}
//             <td className="px-4 py-3 whitespace-nowrap">
//                 <input
//                     type="text"
//                     value={row.qty ?? ""}
//                     onChange={(e) => handleInputChange(index, "qty", e.target.value)}
//                     className="w-full border rounded px-2 py-1"
//                     readOnly={isReadOnly}
//                 />
//             </td>

//             {/* Transaction Type (Display Only) */}
//             <td className="px-4 py-3 whitespace-nowrap">
//                 <input
//                     value={row.TransactionType || ""}
//                     className="w-full border rounded px-2 py-1 bg-gray-50"
//                     readOnly
//                 />
//             </td>

//             {/* Rate Select */}
//             <td className="px-4 py-3 whitespace-nowrap">
//                 {row.rateOptions?.length > 0 ? (
//                     <select
//                         value={row.rateId ?? ""}
//                         onChange={(e) => handleInputChange(index, "rateId", e.target.value)}
//                         className="w-full border rounded px-2 py-1"
//                         disabled={isReadOnly}
//                     >
//                         <option value="">Select Rate</option>
//                         {row.rateOptions.map((opt) => (
//                             <option key={opt.ratE_ID} value={opt.ratE_ID}>
//                                 {opt.ratE_DESC}
//                             </option>
//                         ))}
//                     </select>
//                 ) : (
//                     <input value={row.rate || ""} className="w-full border rounded px-2 py-1" readOnly />
//                 )}
//             </td>

//             {/* Unit Select */}
//             <td className="px-4 py-3 whitespace-nowrap relative group">
//                 <input
//                     value={row.unit}
//                     onChange={(e) => handleInputChange(index, "unit", e.target.value)}
//                     className="w-full border rounded px-2 py-1"
//                     readOnly={isReadOnly}
//                 />
//                 <div className="absolute hidden group-focus-within:block top-full left-0 right-0 bg-white border z-50 shadow-lg max-h-40 overflow-auto">
//                     {uomList.filter(u => u.description.toLowerCase().includes(row.unit?.toLowerCase() || "")).map(u => (
//                         <div key={u.uom_ID} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onMouseDown={() => handleInputChange(index, "unit", u.description)}>
//                             {u.description}
//                         </div>
//                     ))}
//                 </div>
//             </td>

//             {/* Total Value */}
//             <td className="px-4 py-3 whitespace-nowrap">
//                 <input value={row.totalValues} className="w-full border rounded px-2 py-1 bg-gray-50" readOnly />
//             </td>

//             {/* Excl Tax */}
//             <td className="px-4 py-3 whitespace-nowrap">
//                 <input value={row.valueSalesExcludingST} className="w-full border rounded px-2 py-1 bg-gray-50" readOnly />
//             </td>

//             {/* Retail Price */}
//             <td className="px-4 py-3 whitespace-nowrap">
//                 <input
//                     value={row.fixedNotifiedValueOrRetailPrice ?? ""}
//                     onChange={(e) => handleInputChange(index, "fixedNotifiedValueOrRetailPrice", e.target.value)}
//                     className="w-full border rounded px-2 py-1"
//                     readOnly={isReadOnly}
//                 />
//             </td>

//             {/* Sales Tax */}
//             <td className="px-4 py-3 whitespace-nowrap">
//                 <input value={row.salesTaxApplicable} className="w-full border rounded px-2 py-1 bg-gray-50" readOnly />
//             </td>

//             {/* SRO Selection */}
//             <td className="px-4 py-3 whitespace-nowrap">
//                 {row.sroOptions?.length > 0 ? (
//                     <select
//                         value={row.sroScheduleId ?? ""}
//                         onChange={(e) => handleInputChange(index, "sroScheduleId", e.target.value)}
//                         className="w-full border rounded px-2 py-1"
//                         disabled={isReadOnly}
//                     >
//                         <option value="">Select SRO</option>
//                         {row.sroOptions.map(opt => (
//                             <option key={opt.sro_id} value={opt.sro_id}>{opt.srO_DESC}</option>
//                         ))}
//                     </select>
//                 ) : (
//                     <input value={row.sroScheduleNo || ""} className="w-full border rounded px-2 py-1" readOnly />
//                 )}
//             </td>

//             {/* SRO Item */}
//             <td className="px-4 py-3 whitespace-nowrap">
//                 {row.sroItemOptions?.length > 0 ? (
//                     <select
//                         value={row.sroItemId ?? ""}
//                         onChange={(e) => handleInputChange(index, "sroItemId", e.target.value)}
//                         className="w-full border rounded px-2 py-1"
//                         disabled={isReadOnly}
//                     >
//                         <option value="">Select Item</option>
//                         {row.sroItemOptions.map(opt => (
//                             <option key={opt.srO_ITEM_ID} value={opt.srO_ITEM_ID}>{opt.srO_ITEM_DESC}</option>
//                         ))}
//                     </select>
//                 ) : (
//                     <input value={row.sroItemSerialNo || ""} className="w-full border rounded px-2 py-1" readOnly />
//                 )}
//             </td>

//             {/* Action */}
//             <td className="px-4 py-3 whitespace-nowrap text-center sticky right-0 bg-white">
//                 <button
//                     type="button"
//                     onClick={() => removeRow(index)}
//                     className={`bg-red-500 text-white px-3 py-1 rounded ${isReadOnly ? 'opacity-50' : ''}`}
//                     disabled={isReadOnly}
//                 >
//                     Remove
//                 </button>
//             </td>
//         </tr>
//     );
// });

// InvoiceRow.displayName = "InvoiceRow"; // Required for debugging
// export default InvoiceRow;


import React, { memo } from 'react';

const InvoiceRow = memo(({
    row,
    index,
    isReadOnly,
    handleInputChange,
    setHasChanged,
    removeRow,
    hsCodes,
    uomList
}) => {
    const v = (val) => val ?? "";

    return (
        <tr className="bg-white relative border-b">
            {/* 1. HS Code */}
            <td className="px-4 py-3 whitespace-nowrap relative">
                <input
                    type="text"
                    value={v(row.hsCode)}
                    onChange={(e) => { handleInputChange(index, "hsCode", e.target.value); setHasChanged(true); }}
                    onFocus={(e) => { const d = e.target.nextSibling; if (d) d.style.display = "block"; }}
                    onBlur={(e) => { const d = e.target.nextSibling; setTimeout(() => { if (d) d.style.display = "none"; }, 200); }}
                    className="w-full border rounded px-2 py-1"
                    readOnly={isReadOnly}
                />
                <div className="absolute top-full left-0 right-0 bg-white border rounded-md max-h-40 overflow-y-auto z-50 shadow-lg" style={{ display: "none" }}>
                    {hsCodes.filter((h) => `${h.hS_CODE} - ${h.description}`.toLowerCase().includes(v(row.hsCode).toLowerCase())).map((h) => (
                        <div key={h.hS_CODE} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onMouseDown={() => { handleInputChange(index, "hsCode", h.hS_CODE); setHasChanged(true); }}>
                            {h.hS_CODE} - {h.description}
                        </div>
                    ))}
                </div>
            </td>

            {/* 2. Description */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input value={v(row.description)} onChange={(e) => { handleInputChange(index, "description", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 3. Single Unit Price */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input type="text" value={v(row.singleUnitPrice)} onChange={(e) => { handleInputChange(index, "singleUnitPrice", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 4. Qty */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input type="text" value={v(row.qty)} onChange={(e) => { handleInputChange(index, "qty", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 5. Transaction Type */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input value={v(row.TransactionType)} className="w-full border rounded px-2 py-1 bg-gray-50" readOnly />
            </td>

            {/* 6. Rate */}
            <td className="px-4 py-3 whitespace-nowrap">
                {row.rateOptions?.length > 0 ? (
                    <select value={row.rateId ?? ""} onChange={(e) => { handleInputChange(index, "rateId", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" disabled={isReadOnly}>
                        <option value="">Select Rate</option>
                        {row.rateOptions.map((opt) => (
                            <option key={opt.ratE_ID ?? opt.ratE_VALUE} value={opt.ratE_ID ?? opt.ratE_VALUE}>
                                {opt.ratE_DESC ?? String(opt.ratE_VALUE)}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input value={v(row.rate)} className="w-full border rounded px-2 py-1 bg-gray-50" readOnly />
                )}
            </td>

            {/* 7. Unit */}
           <td className="px-4 py-3 whitespace-nowrap relative group">
                <input value={v(row.unit)} onChange={(e) => { handleInputChange(index, "unit", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
                <div className="absolute top-full left-0 right-0 bg-white border rounded-md max-h-40 overflow-y-auto z-50 shadow-lg hidden group-focus-within:block">
                    {uomList.filter((u) => u.description.toLowerCase().includes(v(row.unit).toLowerCase())).map((u, i) => (
                        <div key={`uom-${u.uom_ID ?? i}`} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onMouseDown={() => { handleInputChange(index, "unit", u.description); setHasChanged(true); }}>{u.description}</div>
                    ))}
                </div>
            </td>

            {/* 8. Total Values */}
            <td className="px-4 py-3 whitespace-nowrap"><input value={v(row.totalValues)} className="w-full border rounded px-2 py-1 bg-gray-50" readOnly /></td>

            {/* 9. Value Sales Excl ST */}
            <td className="px-4 py-3 whitespace-nowrap"><input value={v(row.valueSalesExcludingST)} className="w-full border rounded px-2 py-1 bg-gray-50" readOnly /></td>

            {/* 10. Fixed Notified / Retail Price */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input type="text" value={v(row.fixedNotifiedValueOrRetailPrice)} onChange={(e) => { handleInputChange(index, "fixedNotifiedValueOrRetailPrice", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 11. Sales Tax Applicable */}
            <td className="px-4 py-3 whitespace-nowrap"><input value={v(row.salesTaxApplicable)} className="w-full border rounded px-2 py-1 bg-gray-50" readOnly /></td>

            {/* 12. Sales Tax Withheld */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input type="text" value={v(row.salesTaxWithheldAtSource)} onChange={(e) => { handleInputChange(index, "salesTaxWithheldAtSource", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 13. Extra Tax */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input type="text" value={v(row.extraTax)} onChange={(e) => { handleInputChange(index, "extraTax", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 14. Further Tax */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input type="text" value={v(row.furtherTax)} onChange={(e) => { handleInputChange(index, "furtherTax", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 15. SRO Schedule No */}
            <td className="px-4 py-3 whitespace-nowrap">
                {row.sroOptions?.length > 0 ? (
                    <select value={row.sroScheduleId ?? ""} onChange={(e) => { handleInputChange(index, "sroScheduleId", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" disabled={isReadOnly}>
                        <option value="">SRO</option>
                        {row.sroOptions.map((opt, i) => <option key={`sro-${opt.sro_id ?? i}`} value={String(opt.sro_id ?? opt.id)}>{opt.srO_DESC ?? opt.sroScheduleNo}</option>)}
                    </select>
                ) : (<input value={v(row.sroScheduleNo)} className="w-full border rounded px-2 py-1 bg-gray-50" readOnly />)}
            </td>
            {/* 16. FED Payable */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input type="text" value={v(row.fedPayable)} onChange={(e) => { handleInputChange(index, "fedPayable", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 17. Discount */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input type="text" value={v(row.discount)} onChange={(e) => { handleInputChange(index, "discount", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 18. SRO Item Serial No */}
            <td className="px-4 py-3 whitespace-nowrap">
                {row.sroItemOptions?.length > 0 ? (
                    <select value={row.sroItemId ?? ""} onChange={(e) => { handleInputChange(index, "sroItemId", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" disabled={isReadOnly}>
                        <option value="">Select Item</option>
                        {row.sroItemOptions.map(opt => <option key={opt.srO_ITEM_ID ?? opt.id} value={String(opt.srO_ITEM_ID ?? opt.id)}>{opt.srO_ITEM_DESC}</option>)}
                    </select>
                ) : (
                    <input value={v(row.sroItemSerialNo)} className="w-full border rounded px-2 py-1 bg-gray-50" readOnly />
                )}
            </td>

            {/* 19. Internal Qty */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input type="text" value={v(row.internalQty)} onChange={(e) => { handleInputChange(index, "internalQty", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 20. Internal Single Unit Price */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input type="text" value={v(row.internalSinglePrice)} onChange={(e) => { handleInputChange(index, "internalSinglePrice", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 21. Internal UOM */}
            <td className="px-4 py-3 whitespace-nowrap">
                <input value={v(row.internalUOM)} onChange={(e) => { handleInputChange(index, "internalUOM", e.target.value); setHasChanged(true); }} className="w-full border rounded px-2 py-1" readOnly={isReadOnly} />
            </td>

            {/* 22. Remove Button */}
            <td className="px-4 py-3 whitespace-nowrap text-center sticky right-0 bg-white shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">
                <button type="button" onClick={() => { if (!isReadOnly) { removeRow(index); setHasChanged(true); } }} className="bg-red-500 text-white px-3 py-1 rounded" disabled={isReadOnly}>Remove</button>
            </td>
        </tr>
    );
});

InvoiceRow.displayName = "InvoiceRow";
export default InvoiceRow;