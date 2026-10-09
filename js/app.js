window.tabNotes = { quote: "- Báo giá có giá trị trong vòng 15 ngày.\n- Giá trên chưa bao gồm 8% thuế GTGT.\n- Miễn phí giao hàng nội thành TP.HCM.", order: "- Khách hàng kiểm tra và ký xác nhận duyệt nội dung, màu sắc trước khi sản xuất hàng loạt.\n- Hàng giao tận nơi theo thỏa thuận.", delivery: "- Quý khách vui lòng kiểm tra kỹ số lượng và chất lượng trước khi nhận hàng.\n- Hàng giao tận nơi theo thỏa thuận." };
window.tabItems = { quote: null, order: null, delivery: null };
window.tabItems['quote'] = [ { name: "In tem nhãn Decal giấy (Bế đờ mi, cán màng bóng)", unit: "Tem", qty: 5000, price: 350 }, { name: "In hộp giấy Kraft bế dán thành phẩm", unit: "Hộp", qty: 1000, price: 4500 }, { name: "Thiết kế file in (Miễn phí theo đơn)", unit: "Gói", qty: 1, price: 0 } ];
window.itemsList = JSON.parse(JSON.stringify(window.tabItems['quote']));

window.activeDocMode = 'quote';
window.quoteSumMode = 'sum';
window.depositType = 'percent';
window.deliveryPaperSize = 'A4';
window.isCompanyEditing = false;
window.currentOrderId = null;
window.currentOrderDate = null;

window.processAI = () => {
  if (window.activeDocMode !== 'quote') { window.showToast("AI chỉ hỗ trợ phân tích khi đang lập Báo giá mới!", "error"); return; }
  const prompt = document.getElementById('aiPromptInput').value.trim(); const apiKey = window.SafeStore.get('docugen_cfg_ai'); const statusMsg = document.getElementById('aiStatusMsg');
  if(!prompt) { window.showToast("Anh dán tin nhắn vô ô trống trước đã nghen!", "error"); return; }
  if(!apiKey) { statusMsg.innerHTML = '<span class="text-rose-600 font-bold">Chưa có mã API Key! Anh vô phần Cài đặt thêm vô nghen.</span>'; return; }
  
  statusMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang nhờ AI đọc hiểu... (Demo Mode)';
  setTimeout(() => {
    statusMsg.innerHTML = '<span class="text-emerald-600 font-bold">Đã phân tích xong! Anh dò lại form nghen.</span>';
    window.showToast("Nhập liệu AI thành công", "success");
    document.getElementById('custName').value = "KHÁCH HÀNG TỪ ZALO"; document.getElementById('custPhone').value = "0988 777 666";
    window.renderDocPreview();
  }, 1500);
};

window.selectCustomerById = function(id) {
  if (window.activeDocMode !== 'quote') { window.showToast("Chỉ có thể chọn khách hàng ở Tab Báo Giá", "error"); return; }
  let custData = JSON.parse(window.SafeStore.get('docugen_customers') || '{}'); const c = custData[id]; if(!c) return;
  document.getElementById('currentCustomerId').value = id;
  ['custName','custTaxId','custCompanyPhone','custEmail','custAddress','contactPerson','custPhone','deliveryAddress','deliveryTime'].forEach(k => { document.getElementById(k).value = c[k] || ''; });
  document.getElementById('sameAddressCheckbox').checked = !!c.sameAddress;
  window.toggleSameDeliveryAddress(); window.renderDocPreview(); window.closeCustomerModal(); window.showToast("Đã nạp thông tin KH", "success");
};

window.loadOrder = (id) => {
  let orders = JSON.parse(window.SafeStore.get('docugen_orders') || '{}'); let o = orders[id]; if(!o) return;
  window.currentOrderId = id; window.currentOrderDate = o.date; window.switchDocMode(o.mode, false);
  document.getElementById('custName').value = o.customerName || ''; document.getElementById('custTaxId').value = o.taxId || ''; document.getElementById('custCompanyPhone').value = o.companyPhone || ''; document.getElementById('custEmail').value = o.email || ''; document.getElementById('custAddress').value = o.address || ''; document.getElementById('contactPerson').value = o.contactPerson || ''; document.getElementById('custPhone').value = o.phone || ''; document.getElementById('deliveryAddress').value = o.deliveryAddress || ''; document.getElementById('deliveryTime').value = o.deliveryTime || ''; document.getElementById('sameAddressCheckbox').checked = o.sameAddress || false; document.getElementById('currentCustomerId').value = o.customerId || '';
  window.quoteSumMode = o.quoteSumMode || 'sum'; window.depositType = o.depositType || 'percent'; document.getElementById('depositPercent').value = o.depositPercent || 50; document.getElementById('depositFixedAmountInput').value = o.depositAmount || 0; document.getElementById('vatSelect').value = o.vat !== undefined ? o.vat : "8"; document.getElementById('docTerms').value = o.terms || ''; window.tabNotes[o.mode] = o.terms || '';
  window.tabItems[o.mode] = JSON.parse(JSON.stringify(o.items)); window.itemsList = window.tabItems[o.mode];
  window.initDefaultDocMeta(); window.updateModeUI(); window.renderItemsTable(); window.closeOrderModal(); window.showToast(`Đã nạp: ${id}`, "success");
};

window.initDefaultDocMeta = function() {
  const now = new Date(); const docInput = document.getElementById('docNumberInput');
  if (!window.currentOrderId) { docInput.value = "Sẽ cấp tự động khi Lưu"; docInput.classList.add('text-amber-600', 'italic', 'text-xs'); docInput.classList.remove('text-blue-700', 'font-bold', 'text-sm'); } 
  else { docInput.value = window.currentOrderId; docInput.classList.remove('text-amber-600', 'italic', 'text-xs'); docInput.classList.add('text-blue-700', 'font-bold', 'text-sm'); }
  document.getElementById('docDateInput').value = window.currentOrderDate || now.toLocaleDateString('vi-VN');
};

window.switchDocMode = (m, preventReset = false) => { 
  if (!window.tabItems[window.activeDocMode]) window.tabItems[window.activeDocMode] = []; window.tabItems[window.activeDocMode] = JSON.parse(JSON.stringify(window.itemsList));
  window.activeDocMode = m; 
  if (!preventReset) {
      if (!window.tabItems[m]) {
          if (m === 'order' && window.tabItems['quote']) window.tabItems[m] = JSON.parse(JSON.stringify(window.tabItems['quote']));
          else if (m === 'delivery' && window.tabItems['order']) window.tabItems[m] = JSON.parse(JSON.stringify(window.tabItems['order']));
          else if (m === 'delivery' && window.tabItems['quote']) window.tabItems[m] = JSON.parse(JSON.stringify(window.tabItems['quote']));
          else window.tabItems[m] = [{ name: "", unit: "Cái", qty: 1000, price: 0 }];
      }
      window.itemsList = JSON.parse(JSON.stringify(window.tabItems[m])); document.getElementById('docTerms').value = window.tabNotes[m] !== undefined ? window.tabNotes[m] : '';
      window.currentOrderId = null; window.currentOrderDate = null; window.initDefaultDocMeta();
  }
  window.updateModeUI(); window.renderItemsTable(); window.renderDocPreview(); 
};

window.updateTerms = (val) => { window.tabNotes[window.activeDocMode] = val; window.renderDocPreview(); };
window.setQuoteSumMode = (m) => { window.quoteSumMode = m; window.updateModeUI(); window.renderDocPreview(); };
window.setDepositType = (t) => { window.depositType = t; window.updateModeUI(); window.renderDocPreview(); };
window.setDeliveryPaperSize = (s) => { window.deliveryPaperSize = s; window.updateModeUI(); window.renderDocPreview(); };

window.updateModeUI = function() {
  ['quote', 'order', 'delivery'].forEach(m => {
    document.getElementById(`docTabBtn_${m}`).className = m === window.activeDocMode ? "px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 bg-blue-600 text-white shadow-sm" : "px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/70";
    document.getElementById(`modeConfig_${m}`).classList.toggle('hidden', m !== window.activeDocMode);
  });
  const isNoSum = (window.activeDocMode === 'quote' && window.quoteSumMode === 'options');
  document.getElementById('financialSummaryPanel').classList.toggle('hidden', isNoSum); document.getElementById('noSumSummaryBanner').classList.toggle('hidden', !isNoSum);
  document.getElementById('depositBlockUI').classList.toggle('hidden', window.activeDocMode === 'quote');
  document.getElementById('depositPercentBox').classList.toggle('hidden', window.depositType !== 'percent'); document.getElementById('depositAmountBox').classList.toggle('hidden', window.depositType === 'percent');
  
  if(window.depositType === 'percent'){ document.getElementById('depModeBtn_percent').className = "px-2 py-1 bg-white font-bold rounded shadow-sm text-blue-700 transition"; document.getElementById('depModeBtn_amount').className = "px-2 py-1 text-slate-600 font-bold transition"; }
  else { document.getElementById('depModeBtn_amount').className = "px-2 py-1 bg-white font-bold rounded shadow-sm text-blue-700 transition"; document.getElementById('depModeBtn_percent').className = "px-2 py-1 text-slate-600 font-bold transition"; }

  const isQuote = window.activeDocMode === 'quote';
  document.getElementById('customerLockOverlay').classList.toggle('hidden', isQuote); 
  document.getElementById('customerActionButtons').classList.toggle('hidden', !isQuote); 
  document.getElementById('aiInputBlock').classList.toggle('hidden', !isQuote); 
  document.getElementById('sameAddressCheckbox').disabled = !isQuote;
  
  ['custName','custTaxId','custCompanyPhone','custEmail','custAddress','contactPerson','custPhone','deliveryAddress','deliveryTime'].forEach(id => {
      const el = document.getElementById(id); el.readOnly = !isQuote;
      if(!isQuote) el.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed', 'border-transparent'); else el.classList.remove('bg-slate-100', 'text-slate-500', 'cursor-not-allowed', 'border-transparent');
  });
  window.renderItemsTable(); 
};

window.toggleSameDeliveryAddress = () => { if(window.activeDocMode !== 'quote') return; const chk = document.getElementById('sameAddressCheckbox').checked; const d = document.getElementById('deliveryAddress'); if(chk) { d.value = document.getElementById('custAddress').value; d.readOnly = true; d.classList.add('bg-slate-100'); } else { d.readOnly = false; d.classList.remove('bg-slate-100'); } window.renderDocPreview(); };
window.handleCompanyAddressInput = () => { if(document.getElementById('sameAddressCheckbox').checked) document.getElementById('deliveryAddress').value = document.getElementById('custAddress').value; window.renderDocPreview(); };

window.resetCustomerForm = () => {
  window.currentOrderId = null; window.currentOrderDate = null;
  ['currentCustomerId','custName','custTaxId','custCompanyPhone','custEmail','custAddress','contactPerson','custPhone','deliveryAddress'].forEach(id => document.getElementById(id).value = '');
  window.tabItems = { quote: null, order: null, delivery: null }; window.tabItems[window.activeDocMode] = [{ name: "", unit: "Cái", qty: 1, price: 0 }]; window.itemsList = JSON.parse(JSON.stringify(window.tabItems[window.activeDocMode]));
  window.tabNotes = { quote: "- Báo giá có giá trị trong vòng 15 ngày.\n- Giá trên chưa bao gồm 8% thuế GTGT.\n- Miễn phí giao hàng nội thành TP.HCM.", order: "- Khách hàng kiểm tra và ký xác nhận duyệt nội dung, màu sắc trước khi sản xuất hàng loạt.\n- Hàng giao tận nơi theo thỏa thuận.", delivery: "- Quý khách vui lòng kiểm tra kỹ số lượng và chất lượng trước khi nhận hàng.\n- Hàng giao tận nơi theo thỏa thuận." };
  document.getElementById('docTerms').value = window.tabNotes[window.activeDocMode];
  window.initDefaultDocMeta(); window.renderItemsTable(); window.renderDocPreview(); window.showToast("Đã tạo form mới", "info");
};

window.renderItemsTable = function() {
  const tbody = document.getElementById('itemsTableBody'); tbody.innerHTML = ''; const isPriceReadOnly = window.activeDocMode !== 'quote';
  window.itemsList.forEach((it, i) => {
    const priceInputHtml = isPriceReadOnly ? `<div class="relative w-full"><i class="fa-solid fa-lock absolute left-2 top-2 text-slate-400 text-[9px]"></i><input type="number" value="${it.price}" readonly class="w-full text-right pl-5 bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 rounded p-1 text-xs font-mono"></div>` : `<input type="number" value="${it.price}" oninput="window.updateItem(${i}, 'price', this)" class="w-full text-right bg-transparent text-blue-700 border border-slate-300 rounded p-1 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-blue-500">`;
    tbody.innerHTML += `<tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors"><td class="p-2 text-center font-bold text-slate-400">${i+1}</td><td class="p-2"><input type="text" value="${it.name}" oninput="window.updateItem(${i}, 'name', this)" class="w-full bg-transparent border border-slate-300 rounded p-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"></td><td class="p-2"><input type="text" value="${it.unit}" oninput="window.updateItem(${i}, 'unit', this)" class="w-full text-center bg-transparent border border-slate-300 rounded p-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"></td><td class="p-2"><input type="number" value="${it.qty}" oninput="window.updateItem(${i}, 'qty', this)" class="w-full text-right bg-transparent border border-slate-300 rounded p-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"></td><td class="p-2">${priceInputHtml}</td><td class="p-2 text-right font-mono font-bold text-slate-700" id="rowTotal_${i}">${Math.round(it.qty*it.price).toLocaleString('vi-VN')}</td><td class="p-2 text-center"><button onclick="window.removeItemRow(${i})" class="text-rose-400 hover:text-rose-600 transition"><i class="fa-solid fa-xmark"></i></button></td></tr>`;
  });
  window.renderDocPreview();
};
window.updateItem = (i, f, el) => { window.itemsList[i][f] = (f==='qty'||f==='price') ? parseFloat(el.value)||0 : el.value; if(f === 'qty' || f === 'price') { const rowTotalEl = document.getElementById(`rowTotal_${i}`); if(rowTotalEl) rowTotalEl.innerText = Math.round(window.itemsList[i].qty * window.itemsList[i].price).toLocaleString('vi-VN'); } window.renderDocPreview(); };
window.addItemRow = () => { window.itemsList.push({name:"", unit:"Cái", qty:1000, price:0}); window.renderItemsTable(); };
window.removeItemRow = (i) => { window.itemsList.splice(i, 1); window.renderItemsTable(); };
window.handleDepositAmountTyping = (el) => { const val = parseInt(el.value.replace(/[^\d]/g, ''))||0; el.value = val.toLocaleString('vi-VN'); window.renderDocPreview(); };

function docTienBangChu(amount) {
  const num = Math.round(Number(amount) || 0); if (num <= 0) return "Không đồng chẵn.";
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]; const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];
  function readTriple(triple, showZeroHundred) {
    const h = Math.floor(triple / 100); const t = Math.floor((triple % 100) / 10); const u = triple % 10; let res = "";
    if (h > 0 || showZeroHundred) res += digits[h] + " trăm ";
    if (t > 1) { res += digits[t] + " mươi "; if (u === 1) res += "mốt "; else if (u === 4) res += "tư "; else if (u === 5) res += "lăm "; else if (u > 0) res += digits[u] + " "; }
    else if (t === 1) { res += "mười "; if (u === 5) res += "lăm "; else if (u > 0) res += digits[u] + " "; }
    else if (t === 0 && u > 0) { if (h > 0 || showZeroHundred) res += "lẻ " + digits[u] + " "; else res += digits[u] + " "; } return res.trim();
  }
  const groups = []; let temp = num; while (temp > 0) { groups.push(temp % 1000); temp = Math.floor(temp / 1000); } let result = "";
  for (let i = groups.length - 1; i >= 0; i--) { if (groups[i] > 0) result += readTriple(groups[i], i < groups.length - 1) + (units[i] ? " " + units[i] : "") + " "; }
  result = result.trim().replace(/\s+/g, ' '); return result.charAt(0).toUpperCase() + result.slice(1) + " đồng chẵn.";
}

window.renderDocPreview = function() {
  let subtotal = 0; window.itemsList.forEach(it => subtotal += (it.qty*it.price));
  const vatVal = parseFloat(document.getElementById('vatSelect').value); const vatAmount = vatVal > 0 ? Math.round(subtotal * (vatVal/100)) : 0; const grandTotal = subtotal + vatAmount;
  let depAmount = window.depositType === 'percent' ? Math.round(grandTotal * ((parseFloat(document.getElementById('depositPercent').value)||0)/100)) : parseInt(document.getElementById('depositFixedAmountInput').value.replace(/[^\d]/g,''))||0;
  const remain = Math.max(0, grandTotal - depAmount);

  document.getElementById('displaySubtotal').innerText = subtotal.toLocaleString('vi-VN') + ' đ'; document.getElementById('displayVatAmount').innerText = vatAmount.toLocaleString('vi-VN') + ' đ';
  document.getElementById('displayGrandTotal').innerText = grandTotal.toLocaleString('vi-VN') + ' đ'; document.getElementById('displayDepositAmount').innerText = depAmount.toLocaleString('vi-VN') + ' đ'; document.getElementById('displayRemainingAmount').innerText = remain.toLocaleString('vi-VN') + ' đ';
  
  let amountToSpell = grandTotal; if (window.activeDocMode === 'order' || window.activeDocMode === 'delivery') amountToSpell = remain;
  const totalWords = docTienBangChu(amountToSpell);
  document.getElementById('displayAmountWords').innerText = totalWords; document.getElementById('displayDepositWords').innerText = docTienBangChu(depAmount);

  const pSize = window.activeDocMode === 'delivery' ? window.deliveryPaperSize : (window.activeDocMode === 'order' && window.deliveryPaperSize ? window.deliveryPaperSize : 'A4');
  if(pSize === 'A6-portrait') { document.getElementById('printDocument').className = 'a6-portrait-sheet font-document text-black'; document.getElementById('dynamicPagePrintStyle').innerHTML = '@page { size: A6 portrait; margin: 0; }'; document.getElementById('previewPaperSizeBadge').innerText = 'Khổ A6 (In xưởng)'; } else if(pSize === 'A5-landscape') { document.getElementById('printDocument').className = 'a5-landscape-sheet font-document text-black'; document.getElementById('dynamicPagePrintStyle').innerHTML = '@page { size: A5 landscape; margin: 0; }'; document.getElementById('previewPaperSizeBadge').innerText = 'Khổ A5 Ngang'; } else if(pSize === 'A5-portrait') { document.getElementById('printDocument').className = 'a5-portrait-sheet font-document text-black'; document.getElementById('dynamicPagePrintStyle').innerHTML = '@page { size: A5 portrait; margin: 0; }'; document.getElementById('previewPaperSizeBadge').innerText = 'Khổ A5 Đứng'; } else { document.getElementById('printDocument').className = 'a4-sheet font-document text-black'; document.getElementById('dynamicPagePrintStyle').innerHTML = '@page { size: A4 portrait; margin: 0; }'; document.getElementById('previewPaperSizeBadge').innerText = 'Khổ A4'; }

  const cName = document.getElementById('custName').value.trim() || '...........................................'; const taxLines = [];
  ['custTaxId','custCompanyPhone','custEmail'].forEach(id => { const val = document.getElementById(id).value.trim(); if(val) taxLines.push(id==='custTaxId'?`<strong>MST:</strong> ${val}`:id==='custCompanyPhone'?`<strong>SĐT:</strong> ${val}`:`<strong>Email:</strong> ${val}`); });
  const sName = document.getElementById('sellerName').value || window.DEFAULT_COMPANY.name; const sAdd = document.getElementById('sellerAddress').value || window.DEFAULT_COMPANY.address; const sBranch = document.getElementById('sellerBranch').value || window.DEFAULT_COMPANY.branch; const sHotline = document.getElementById('sellerPhone').value || window.DEFAULT_COMPANY.phone; const sTax = document.getElementById('sellerTaxCode').value || window.DEFAULT_COMPANY.taxCode;
  const creatorName = document.getElementById('docCreatorInput').value || window.currentAppFullName; let title = window.activeDocMode === 'quote' ? 'BẢNG BÁO GIÁ' : (window.activeDocMode === 'order' ? 'ĐƠN ĐẶT HÀNG' : document.getElementById('deliveryTitleSelect').value);
  const hidePrice = (window.activeDocMode === 'delivery' && !document.getElementById('deliveryShowPriceCheckbox').checked) || pSize === 'A6-portrait'; const isNoSum = (window.activeDocMode === 'quote' && window.quoteSumMode === 'options');
  
  const isA6 = pSize === 'A6-portrait'; const isA5P = pSize === 'A5-portrait'; const isA5 = pSize !== 'A4' && !isA6;
  const fontT = isA6 ? '14px' : (isA5P ? '16px' : (isA5 ? '18px' : '21px')); const fontBase = isA6 ? '9px' : (isA5P ? '10.5px' : (isA5 ? '12px' : '13.5px')); const cellP = isA6 ? '2px 3px' : (isA5P ? '3px 4px' : '6px 8px');

  let tbodyStr = '';
  window.itemsList.forEach((it, i) => {
    if(hidePrice) { tbodyStr += `<tr><td style="border:1px solid #000;text-align:center;padding:${cellP}">${i+1}</td><td style="border:1px solid #000;padding:${cellP}"><strong>${it.name}</strong></td><td style="border:1px solid #000;text-align:center;padding:${cellP}">${it.unit}</td><td style="border:1px solid #000;text-align:center;padding:${cellP}">${it.qty.toLocaleString('vi-VN')}</td>${isA6 ? '' : `<td style="border:1px solid #000;padding:${cellP}"></td>`}</tr>`; }
    else { tbodyStr += `<tr><td style="border:1px solid #000;text-align:center;padding:${cellP}">${i+1}</td><td style="border:1px solid #000;padding:${cellP}"><strong>${it.name}</strong></td><td style="border:1px solid #000;text-align:center;padding:${cellP}">${it.unit}</td><td style="border:1px solid #000;text-align:center;padding:${cellP}">${it.qty.toLocaleString('vi-VN')}</td><td style="border:1px solid #000;text-align:right;padding:${cellP}">${it.price.toLocaleString('vi-VN')}</td><td style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">${Math.round(it.qty*it.price).toLocaleString('vi-VN')}</td></tr>`; }
  });
  const termsText = document.getElementById('docTerms').value.trim(); const termsHtml = termsText ? `<div style="margin-bottom:15px; white-space: pre-wrap; font-size:${isA6?'9px':(isA5?'11px':'13px')};"><strong>Ghi chú:</strong><br>${termsText}</div>` : '';
  if(!hidePrice && !isNoSum && !isA6) {
    if(vatVal > 0) tbodyStr += `<tr><td colspan="5" style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">Cộng tiền hàng:</td><td style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">${subtotal.toLocaleString('vi-VN')}</td></tr><tr><td colspan="5" style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">Thuế VAT (${vatVal}%):</td><td style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">${vatAmount.toLocaleString('vi-VN')}</td></tr>`;
    tbodyStr += `<tr><td colspan="5" style="border:1px solid #000;text-align:right;font-weight:bold;font-size:${isA5?'11px':'14px'};padding:${cellP};color:#b91c1c;">TỔNG CỘNG THANH TOÁN:</td><td style="border:1px solid #000;text-align:right;font-weight:bold;font-size:${isA5?'11px':'14px'};padding:${cellP};color:#b91c1c;">${grandTotal.toLocaleString('vi-VN')} đ</td></tr>`;
    if(depAmount > 0 && window.activeDocMode !== 'delivery' && window.activeDocMode !== 'quote') { tbodyStr += `<tr><td colspan="5" style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">Đặt cọc trước:</td><td style="border:1px solid #000;text-align:right;font-weight:bold;color:#1e3a8a;padding:${cellP}">${depAmount.toLocaleString('vi-VN')} đ</td></tr><tr><td colspan="5" style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">Còn lại:</td><td style="border:1px solid #000;text-align:right;font-weight:bold;color:#b91c1c;padding:${cellP}">${remain.toLocaleString('vi-VN')} đ</td></tr>`; }
  }
  let headerHtml = '';
  if(isA6) { headerHtml = `<div style="border-bottom: 1px solid #1e3a8a; padding-bottom: 4px; margin-bottom: 6px; text-align:center;"><div style="font-size:10px; font-weight:bold; color:#1e3a8a;">${sName}</div><div style="font-size:8px;"><strong>Hotline:</strong> <span style="color:#b91c1c;font-weight:bold;">${sHotline}</span></div></div><table style="width:100%; font-size:8px; margin-bottom:4px;"><tr><td style="text-align:left;"><strong>Số:</strong> ${document.getElementById('docNumberInput').value}</td><td style="text-align:right;"><strong>Ngày:</strong> ${document.getElementById('docDateInput').value}</td></tr></table>`; } 
  else { headerHtml = `<div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 10px;"><table style="width:100%;"><tr><td style="width:70%;vertical-align:top;"><div style="font-size:${isA5P?'12px':'15px'}; font-weight:bold; color:#1e3a8a;">${sName}</div><div><strong>Địa chỉ:</strong> ${sAdd}</div>${sBranch ? `<div><strong>Chi nhánh:</strong> ${sBranch}</div>` : ''}<div><strong>Hotline:</strong> <span style="color:#b91c1c;font-weight:bold;">${sHotline}</span> | <strong>MST:</strong> ${sTax}</div></td><td style="width:30%;vertical-align:top;text-align:right;"><div style="border:1px solid #ccc; padding:4px; border-radius:4px; text-align:left; display:inline-block;"><div><strong>Số:</strong> ${document.getElementById('docNumberInput').value}</div><div><strong>Ngày:</strong> ${document.getElementById('docDateInput').value}</div></div></td></tr></table></div>`; }
  document.getElementById('printDocument').innerHTML = `
    <div style="font-size:${fontBase}; line-height:1.4;">
      ${headerHtml}
      <h1 style="text-align:center; font-size:${fontT}; font-weight:bold; margin: ${isA6?'6px 0':'12px 0'};">${title}</h1>
      <div style="border:1px solid #334155; padding:${isA6?'4px 6px':'6px 8px'}; margin-bottom:10px; background:#fcfcfc;">
        <div style="display:flex; margin-bottom:2px;"><span style="font-weight:bold; width:${isA6?'60px':'100px'}; flex-shrink:0;">Khách hàng:</span> <strong style="color:#1e3a8a;">${cName}</strong></div>
        ${taxLines.length > 0 && !isA6 ? `<div style="margin-bottom:2px;">${taxLines.join(' &nbsp;|&nbsp; ')}</div>` : ''}
        ${!isA6 ? `<div style="display:flex; margin-bottom:2px;"><span style="font-weight:bold; width:100px; flex-shrink:0;">Địa chỉ:</span> <span>${document.getElementById('custAddress').value}</span></div>` : ''}
        <div style="display:flex; margin-bottom:2px;"><span style="font-weight:bold; width:${isA6?'60px':'100px'}; flex-shrink:0;">Liên hệ:</span> <span><strong style="color:#1e3a8a;">${document.getElementById('contactPerson').value}</strong> &nbsp;|&nbsp; <strong>SĐT:</strong> <strong>${document.getElementById('custPhone').value}</strong></span></div>
        <div style="display:flex; margin-bottom:2px;"><span style="font-weight:bold; width:${isA6?'60px':'100px'}; flex-shrink:0;">Giao hàng:</span> <span>${document.getElementById('deliveryAddress').value}</span></div>
        ${isA6 && document.getElementById('deliveryTime').value ? `<div style="display:flex; margin-bottom:2px;"><span style="font-weight:bold; width:60px; flex-shrink:0;">Thời gian:</span> <span>${document.getElementById('deliveryTime').value}</span></div>` : ''}
      </div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:10px;">
        <thead style="background:#e2e8f0;">
          ${hidePrice ? `<tr><th style="border:1px solid #000;padding:${cellP};width:6%">STT</th><th style="border:1px solid #000;padding:${cellP};width:${isA6?'60%':'54%'}">TÊN HÀNG & QUY CÁCH</th><th style="border:1px solid #000;padding:${cellP};width:10%">ĐVT</th><th style="border:1px solid #000;padding:${cellP};width:12\%">SL</th>${isA6 ? '' : `<th style="border:1px solid #000;padding:${cellP};width:18%">KIỂM ĐẾM</th>`}</tr>` : `<tr><th style="border:1px solid #000;padding:${cellP};width:5%">STT</th><th style="border:1px solid #000;padding:${cellP};width:43%">TÊN HÀNG & QUY CÁCH</th><th style="border:1px solid #000;padding:${cellP};width:8%">ĐVT</th><th style="border:1px solid #000;padding:${cellP};width:11%">SL</th><th style="border:1px solid #000;padding:${cellP};width:16%">ĐƠN GIÁ</th><th style="border:1px solid #000;padding:${cellP};width:17%">THÀNH TIỀN</th></tr>`}
        </thead>
        <tbody>${tbodyStr}</tbody>
      </table>
      ${(!hidePrice && !isNoSum && !isA6) ? `<div style="margin-bottom:15px;">• Số tiền bằng chữ: <strong>${totalWords}</strong></div>` : ''}
      ${isNoSum && !isA6 ? `<div style="font-style:italic; margin-bottom:10px;">* Lưu ý: Bảng báo giá trên gồm các phương án lựa chọn độc lập.</div>` : ''}
      ${!isA6 ? termsHtml : ''}
      ${!isA6 ? `<table style="width:100%; text-align:center; margin-top:20px;"><tr>${window.activeDocMode === 'delivery' ? `<td style="width:33%;"><strong>NGƯỜI LẬP PHIẾU</strong><br><br><br><br><br><strong>${creatorName}</strong></td><td style="width:33%;"><strong>NGƯỜI GIAO HÀNG</strong><br><br><br><br><br></td><td style="width:34%;"><strong>NGƯỜI NHẬN HÀNG</strong><br><br><br><br><br></td>` : `<td style="width:50%;"><strong>XÁC NHẬN KHÁCH HÀNG</strong><br><br><br><br><br></td><td style="width:50%;"><strong>ĐẠI DIỆN</strong><br><strong>${sName.toUpperCase()}</strong><br><br><br><br><strong>${creatorName}</strong></td>`}</tr></table>` : `<div style="text-align:right; font-weight:bold; margin-top:10px;">Lập phiếu: ${creatorName}</div>`}
    </div>`;
};

window.exportToPdf = async function() {
  const pSize = window.activeDocMode === 'delivery' ? window.deliveryPaperSize : (window.activeDocMode === 'order' && window.deliveryPaperSize ? window.deliveryPaperSize : 'A4');
  let format = 'a4'; let orientation = 'portrait';
  if(pSize === 'A6-portrait') format = 'a6'; else if(pSize === 'A5-landscape') { format = 'a5'; orientation = 'landscape'; } else if(pSize === 'A5-portrait') format = 'a5';
  const opt = { margin:0, filename:`${document.getElementById('docNumberInput').value.replace('Sẽ cấp tự động khi Lưu', 'Phieu_Moi')}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm', format: format, orientation: orientation} };
  const btn = document.getElementById('headerExportPdfBtn'); btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';
  await html2pdf().set(opt).from(document.getElementById('printDocument')).save();
  btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Tải PDF';
};

window.switchViewTab = (t) => { document.getElementById('section-form').classList.toggle('hidden', t!=='form'); document.getElementById('section-preview').classList.toggle('hidden', t==='form'); };
window.fitZoomScreen = () => document.getElementById('zoomWrapper').style.transform = `scale(${window.innerWidth < 768 ? 0.6 : (window.innerWidth < 1280 ? 0.8 : 0.92)})`;
window.addEventListener('resize', window.fitZoomScreen);

// KÍCH HOẠT HỆ THỐNG SAU KHI LOAD XONG FILE
window.initAppAuth();