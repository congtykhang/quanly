// ==========================================
// DOCUGEN PRO - GIAO DIỆN & XỬ LÝ CHÍNH (APP.JS)
// ==========================================

window.activeDocMode = 'quote';
window.quoteSumMode = 'sum';
window.depositType = 'percent';
window.deliveryPaperSize = 'A4';
window.isCompanyEditing = false;
window.currentOrderId = null;
window.currentOrderDate = null;
window.orderDates = null;
window.aiAttachedImage = null; // Biến lưu trữ ảnh đính kèm cho AI

window.tabNotes = { 
  quote: "- Báo giá có giá trị trong vòng 15 ngày.\n- Giá trên chưa bao gồm 8% thuế GTGT.\n- Miễn phí giao hàng nội thành TP.HCM.", 
  order: "- Khách hàng kiểm tra và ký xác nhận duyệt nội dung, màu sắc trước khi sản xuất hàng loạt.\n- Hàng giao tận nơi theo thỏa thuận.", 
  delivery: "- Quý khách vui lòng kiểm tra kỹ số lượng và chất lượng trước khi nhận hàng.\n- Hàng giao tận nơi theo thỏa thuận." 
};
window.tabItems = { quote: null, order: null, delivery: null };
window.tabItems['quote'] = [ { name: "In tem nhãn Decal giấy (Bế đờ mi, cán màng bóng)", unit: "Tem", qty: 5000, price: 350 }, { name: "In hộp giấy Kraft bế dán thành phẩm", unit: "Hộp", qty: 1000, price: 4500 }, { name: "Thiết kế file in (Miễn phí theo đơn)", unit: "Gói", qty: 1, price: 0 } ];
window.itemsList = JSON.parse(JSON.stringify(window.tabItems['quote']));

// KHỞI ĐỘNG HỆ THỐNG & TÍNH NĂNG DÁN ẢNH CHO AI
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DocuGen Pro đang khởi động...");
  
  const mStyle = document.createElement('style');
  mStyle.innerHTML = `
    @media (max-width: 768px) {
      #section-form input[type="text"], #section-form input[type="number"], #section-form input[type="email"], #section-form select, #section-form textarea { font-size: 16px !important; padding: 12px 10px !important; border-radius: 8px !important; margin-bottom: 4px !important; }
      #section-form button { min-height: 44px !important; }
      .overflow-x-auto { -webkit-overflow-scrolling: touch; }
      #itemsTableBody td { padding: 6px 4px !important; }
      #itemsTableBody input { min-width: 70px !important; padding: 10px 8px !important; font-size: 16px !important; background-color: #f8fafc !important; }
      #itemsTableBody textarea { font-size: 16px !important; padding: 10px !important; }
      #section-form .grid { gap: 16px !important; }
    }
  `;
  document.head.appendChild(mStyle);

  // LẮNG NGHE SỰ KIỆN DÁN (PASTE) ĐỂ BẮT HÌNH ẢNH CHO AI
  document.addEventListener('paste', (e) => {
    if (window.activeDocMode !== 'quote') return;
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file' && item.type.includes('image/')) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result.split(',')[1];
          window.aiAttachedImage = { inlineData: { data: base64Data, mimeType: item.type } };
          
          let previewContainer = document.getElementById('aiImagePreviewContainer');
          if (!previewContainer) {
            const aiBlock = document.getElementById('aiInputBlock');
            if (aiBlock) {
              previewContainer = document.createElement('div');
              previewContainer.id = 'aiImagePreviewContainer';
              previewContainer.className = 'mt-2 relative inline-block';
              aiBlock.appendChild(previewContainer);
            }
          }
          if (previewContainer) {
            previewContainer.innerHTML = `<img src="${event.target.result}" class="h-20 object-cover rounded-lg border-2 border-indigo-400 shadow-md">
            <button onclick="window.removeAiImage()" class="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow transition"><i class="fa-solid fa-xmark"></i></button>`;
            previewContainer.classList.remove('hidden');
          }
          if(window.showToast) window.showToast("Đã đính kèm ảnh cho AI", "success");
        };
        reader.readAsDataURL(blob);
        break; 
      }
    }
  });

  const searchCustomerInput = document.getElementById('searchCustomerInput');
  if (searchCustomerInput) searchCustomerInput.addEventListener('input', (e) => { if(window.renderCustomerList) window.renderCustomerList(e.target.value); });
  
  document.getElementById('tabModeQuote')?.addEventListener('click', () => window.switchDocMode('quote'));
  document.getElementById('tabModeOrder')?.addEventListener('click', () => window.switchDocMode('order'));
  document.getElementById('tabModeDelivery')?.addEventListener('click', () => window.switchDocMode('delivery'));

  if (window.initAppAuth) await window.initAppAuth();
  else {
    document.getElementById('authLoadingOverlay')?.classList.add('hidden');
    document.getElementById('loginBox')?.classList.remove('hidden');
  }
});

// Xóa ảnh đã đính kèm
window.removeAiImage = () => {
    window.aiAttachedImage = null;
    const container = document.getElementById('aiImagePreviewContainer');
    if(container) container.classList.add('hidden');
};

// HÀM AI ĐÃ CHUYỂN SANG DÙNG TRẠM TRUNG CHUYỂN
window.processAI = async () => {
  if (window.activeDocMode !== 'quote') { 
      window.showToast("AI chỉ hỗ trợ phân tích khi đang lập Báo giá mới!", "error"); return; 
  }
  
  const promptText = document.getElementById('aiPromptInput').value.trim(); 
  const statusMsg = document.getElementById('aiStatusMsg');
  
  // DÁN CÁI LINK WEB APP (SCRIPT.GOOGLE.COM) MÀ ANH VỪA LẤY ĐƯỢC VÀO ĐÂY:
  const scriptUrl = "https://script.google.com/macros/s/AKfycbzcahuGuwKYRLTrKA7IrbJp1UCW2Z4RAVqFkWhkF5Z1Bwtol6-ymN-qGrDbD0giT6Pc/exec"; 
  
  if(!promptText && !window.aiAttachedImage) { 
      window.showToast("Anh nhập nội dung hoặc dán ảnh (Ctrl+V) vô trước đã nghen!", "error"); return; 
  }
  if(!scriptUrl || scriptUrl === "DÁN_LINK_WEB_APP_CỦA_ANH_VÀO_ĐÂY") { 
      statusMsg.innerHTML = '<span class="text-rose-600 font-bold">Anh chưa chèn Link Trạm trung chuyển vào code!</span>'; return; 
  }
  
  statusMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi dữ liệu qua Trạm AI xử lý...';
  
  try {
    const payload = {
        promptText: promptText,
        attachedImage: window.aiAttachedImage
    };

    // Đẩy dữ liệu qua trạm trung chuyển Apps Script
    const response = await fetch(scriptUrl, {
      method: 'POST',
      // Dùng text/plain để bypass lỗi chặn chéo nguồn (CORS) của trình duyệt
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error);
    if (!data.success || !data.data) throw new Error("Dữ liệu trả về bị lỗi");

    const result = data.data;

    // Rải dữ liệu JSON lên màn hình
    if(result.custName) document.getElementById('custName').value = result.custName.toUpperCase();
    if(result.custPhone) document.getElementById('custPhone').value = result.custPhone;
    if(result.deliveryAddress) document.getElementById('deliveryAddress').value = result.deliveryAddress;
    
    if(result.items && Array.isArray(result.items) && result.items.length > 0) {
        window.itemsList = result.items.map(item => ({
            name: item.name || "Hàng in",
            unit: item.unit || "Cái",
            qty: Number(item.qty) || 1,
            price: 0 
        }));
        window.renderItemsTable();
    }

    statusMsg.innerHTML = '<span class="text-emerald-600 font-bold">Đã phân tích xong! Anh điền thêm đơn giá nhé.</span>';
    window.showToast("AI nhập liệu thành công", "success");
    window.renderDocPreview();
    
    window.removeAiImage();
    
  } catch (error) {
    console.error("Lỗi trạm trung chuyển AI:", error);
    statusMsg.innerHTML = `<span class="text-rose-600 font-bold">Lỗi: ${error.message}</span>`;
    window.showToast("Lỗi phân tích AI", "error");
  }
};

window.selectCustomerById = function(id) {
  if (window.activeDocMode !== 'quote') { window.showToast("Chỉ có thể chọn khách hàng ở Tab Báo Giá", "error"); return; }
  let custData = JSON.parse(window.SafeStore.get('docugen_customers') || '{}'); const c = custData[id]; if(!c) return;
  const setVal = (elmId, val) => { const el = document.getElementById(elmId); if(el) el.value = val || ''; };
  setVal('currentCustomerId', id); setVal('custName', c.name); setVal('custTaxId', c.taxId); setVal('custCompanyPhone', c.companyPhone); setVal('custEmail', c.email); setVal('custAddress', c.address); setVal('contactPerson', c.contactPerson); setVal('custPhone', c.phone); setVal('deliveryAddress', c.deliveryAddress); setVal('deliveryTime', c.deliveryTime);
  const sameAddr = document.getElementById('sameAddressCheckbox'); if(sameAddr) sameAddr.checked = !!c.sameAddress;
  if(window.toggleSameDeliveryAddress) window.toggleSameDeliveryAddress(); window.renderDocPreview(); if(window.closeCustomerModal) window.closeCustomerModal(); window.showToast("Đã nạp thông tin KH", "success");
};

window.loadOrder = (id) => {
  let orders = JSON.parse(window.SafeStore.get('docugen_orders') || '{}'); let o = orders[id]; if(!o) return;
  window.currentOrderId = o.baseId || id;
  if (window.currentOrderId.includes('-') && (window.currentOrderId.startsWith('BG-') || window.currentOrderId.startsWith('ĐH-') || window.currentOrderId.startsWith('GH-'))) window.currentOrderId = window.currentOrderId.substring(3); 
  window.orderDates = o.orderDates || { quote: o.date, order: null, delivery: null };
  if (o.tabItems && (o.tabItems.quote || o.tabItems.order || o.tabItems.delivery)) window.tabItems = JSON.parse(JSON.stringify(o.tabItems));
  else { window.tabItems = { quote: null, order: null, delivery: null }; window.tabItems[o.mode || 'quote'] = JSON.parse(JSON.stringify(o.items || [])); }
  if (o.tabNotes) window.tabNotes = JSON.parse(JSON.stringify(o.tabNotes));
  else { window.tabNotes = { quote: "- Báo giá có giá trị trong vòng 15 ngày.\n- Giá trên chưa bao gồm 8% thuế GTGT.\n- Miễn phí giao hàng nội thành TP.HCM.", order: "- Khách hàng kiểm tra và ký xác nhận duyệt nội dung, màu sắc trước khi sản xuất hàng loạt.\n- Hàng giao tận nơi theo thỏa thuận.", delivery: "- Quý khách vui lòng kiểm tra kỹ số lượng và chất lượng trước khi nhận hàng.\n- Hàng giao tận nơi theo thỏa thuận." }; window.tabNotes[o.mode || 'quote'] = o.terms || ''; }
  const setVal = (elmId, val) => { const el = document.getElementById(elmId); if(el) el.value = val || ''; };
  setVal('custName', o.customerName); setVal('custTaxId', o.taxId); setVal('custCompanyPhone', o.companyPhone); setVal('custEmail', o.email); setVal('custAddress', o.address); setVal('contactPerson', o.contactPerson); setVal('custPhone', o.phone); setVal('deliveryAddress', o.deliveryAddress); setVal('deliveryTime', o.deliveryTime); setVal('currentCustomerId', o.customerId);
  const sameAddr = document.getElementById('sameAddressCheckbox'); if(sameAddr) sameAddr.checked = !!o.sameAddress;
  window.quoteSumMode = o.quoteSumMode || 'sum'; window.depositType = o.depositType || 'percent'; setVal('depositPercent', o.depositPercent || 50); setVal('depositFixedAmountInput', o.depositAmount || 0); setVal('vatSelect', o.vat !== undefined ? o.vat : "8"); 
  window.switchDocMode(o.mode || 'quote', true);
  if(window.closeOrderModal) window.closeOrderModal(); window.showToast(`Đã nạp bộ hồ sơ: ${id}`, "success");
};

window.initDefaultDocMeta = function() {
  const now = new Date(); const docInput = document.getElementById('docNumberInput');
  if (!window.currentOrderId) { 
      if(docInput) { docInput.value = "Sẽ cấp tự động khi Lưu"; docInput.classList.add('text-amber-600', 'italic', 'text-xs'); docInput.classList.remove('text-blue-700', 'font-bold', 'text-sm'); }
      const dateInp = document.getElementById('docDateInput'); if(dateInp) dateInp.value = now.toLocaleDateString('vi-VN');
  } else { 
      const pfx = window.activeDocMode === 'quote' ? 'BG' : (window.activeDocMode === 'order' ? 'ĐH' : 'GH');
      if(docInput) { docInput.value = `${pfx}-${window.currentOrderId}`; docInput.classList.remove('text-amber-600', 'italic', 'text-xs'); docInput.classList.add('text-blue-700', 'font-bold', 'text-sm'); }
      let docDate = now.toLocaleDateString('vi-VN');
      if (window.orderDates && window.orderDates[window.activeDocMode]) docDate = window.orderDates[window.activeDocMode];
      const dateInp = document.getElementById('docDateInput'); if(dateInp) dateInp.value = docDate;
  }
};

window.switchDocMode = (m, preventReset = false) => { 
  if (!preventReset && window.tabItems && window.itemsList) { window.tabItems[window.activeDocMode] = JSON.parse(JSON.stringify(window.itemsList)); const termsEl = document.getElementById('docTerms'); if(termsEl) window.tabNotes[window.activeDocMode] = termsEl.value; }
  if (window.currentOrderId && !window.orderDates) window.orderDates = { quote: window.currentOrderDate, order: null, delivery: null };
  if (!preventReset && m !== window.activeDocMode) {
      if (m === 'order' && !window.currentOrderId) { if(window.showToast) window.showToast("Bắt buộc phải LƯU BÁO GIÁ trước khi lên Đơn Đặt Hàng!", "error"); return; }
      if (m === 'delivery' && !window.currentOrderId) { if(window.showToast) window.showToast("Bắt buộc phải LƯU ĐƠN ĐẶT HÀNG trước khi xuất Giao Hàng!", "error"); return; }
  }
  window.activeDocMode = m; 
  const btnQuote = document.getElementById('tabModeQuote'); const btnOrder = document.getElementById('tabModeOrder'); const btnDelivery = document.getElementById('tabModeDelivery');
  if(btnQuote) btnQuote.className = m === 'quote' ? 'px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow transition' : 'px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 transition rounded-lg';
  if(btnOrder) btnOrder.className = m === 'order' ? 'px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow transition' : 'px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 transition rounded-lg';
  if(btnDelivery) btnDelivery.className = m === 'delivery' ? 'px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow transition' : 'px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 transition rounded-lg';
  if (!preventReset) {
      if (!window.tabItems[m]) {
          if (m === 'quote' && window.tabItems['order']) window.tabItems[m] = JSON.parse(JSON.stringify(window.tabItems['order'])); else if (m === 'order' && window.tabItems['quote']) window.tabItems[m] = JSON.parse(JSON.stringify(window.tabItems['quote'])); else if (m === 'delivery' && window.tabItems['order']) window.tabItems[m] = JSON.parse(JSON.stringify(window.tabItems['order'])); else if (m === 'delivery' && window.tabItems['quote']) window.tabItems[m] = JSON.parse(JSON.stringify(window.tabItems['quote'])); else window.tabItems[m] = [{ name: "", unit: "Cái", qty: 1, price: 0 }];
      }
      if (!window.currentOrderId) { window.currentOrderId = null; window.orderDates = null; }
  }
  window.itemsList = JSON.parse(JSON.stringify(window.tabItems[m] || [])); 
  const tEl = document.getElementById('docTerms'); if(tEl) tEl.value = window.tabNotes[m] !== undefined ? window.tabNotes[m] : '';
  window.initDefaultDocMeta(); if(window.updateModeUI) window.updateModeUI(); if(window.renderItemsTable) window.renderItemsTable(); if(window.renderDocPreview) window.renderDocPreview(); 
};

window.updateTerms = (val) => { window.tabNotes[window.activeDocMode] = val; window.renderDocPreview(); };
window.setQuoteSumMode = (m) => { window.quoteSumMode = m; window.updateModeUI(); window.renderDocPreview(); };
window.setDepositType = (t) => { window.depositType = t; window.updateModeUI(); window.renderDocPreview(); };
window.setDeliveryPaperSize = (s) => { window.deliveryPaperSize = s; window.updateModeUI(); window.renderDocPreview(); };

window.updateModeUI = function() {
  ['quote', 'order', 'delivery'].forEach(m => {
    const btn = document.getElementById(`docTabBtn_${m}`);
    if(btn) btn.className = m === window.activeDocMode ? "px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 bg-blue-600 text-white shadow-sm" : "px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/70";
    const cfg = document.getElementById(`modeConfig_${m}`);
    if(cfg) cfg.classList.toggle('hidden', m !== window.activeDocMode);
  });
  
  const isNoSum = (window.activeDocMode === 'quote' && window.quoteSumMode === 'options');
  const finPanel = document.getElementById('financialSummaryPanel'); if(finPanel) finPanel.classList.toggle('hidden', isNoSum); 
  const noSumPanel = document.getElementById('noSumSummaryBanner'); if(noSumPanel) noSumPanel.classList.toggle('hidden', !isNoSum);
  const depBlock = document.getElementById('depositBlockUI'); if(depBlock) depBlock.classList.remove('hidden');
  const depPctBox = document.getElementById('depositPercentBox'); if(depPctBox) depPctBox.classList.toggle('hidden', window.depositType !== 'percent'); 
  const depAmtBox = document.getElementById('depositAmountBox'); if(depAmtBox) depAmtBox.classList.toggle('hidden', window.depositType === 'percent');
  
  const btnPct = document.getElementById('depModeBtn_percent'); const btnAmt = document.getElementById('depModeBtn_amount');
  if(window.depositType === 'percent'){ if(btnPct) btnPct.className = "px-2 py-1 bg-white font-bold rounded shadow-sm text-blue-700 transition"; if(btnAmt) btnAmt.className = "px-2 py-1 text-slate-600 font-bold transition"; }
  else { if(btnAmt) btnAmt.className = "px-2 py-1 bg-white font-bold rounded shadow-sm text-blue-700 transition"; if(btnPct) btnPct.className = "px-2 py-1 text-slate-600 font-bold transition"; }

  const isQuote = window.activeDocMode === 'quote';
  const lockOl = document.getElementById('customerLockOverlay'); if(lockOl) lockOl.classList.toggle('hidden', isQuote); 
  const actBtns = document.getElementById('customerActionButtons'); if(actBtns) actBtns.classList.toggle('hidden', !isQuote); 
  const aiBlock = document.getElementById('aiInputBlock'); if(aiBlock) aiBlock.classList.toggle('hidden', !isQuote); 
  const chkSame = document.getElementById('sameAddressCheckbox'); if(chkSame) chkSame.disabled = !isQuote;

  const titleEl = document.getElementById('docMainTitle');
  if(titleEl) titleEl.innerText = window.activeDocMode === 'quote' ? 'BẢNG BÁO GIÁ' : (window.activeDocMode === 'order' ? 'ĐƠN ĐẶT HÀNG' : 'PHIẾU GIAO HÀNG');

  ['custName','custTaxId','custCompanyPhone','custEmail','custAddress','contactPerson','custPhone','deliveryAddress','deliveryTime'].forEach(id => {
      const el = document.getElementById(id); 
      if(el) { el.readOnly = !isQuote; if(!isQuote) el.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed', 'border-transparent'); else el.classList.remove('bg-slate-100', 'text-slate-500', 'cursor-not-allowed', 'border-transparent'); }
  });

  const saveBtn = document.querySelector('button[onclick="window.saveOrderToCloud()"]');
  if (saveBtn) {
      let btnText = window.activeDocMode === 'quote' ? 'Lưu Báo Giá' : (window.activeDocMode === 'order' ? 'Lưu Đặt Hàng' : 'Lưu Giao Hàng');
      saveBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> ${btnText}`;
      if (window.activeDocMode === 'order') saveBtn.className = "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow transition flex items-center gap-2";
      else if (window.activeDocMode === 'delivery') saveBtn.className = "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow transition flex items-center gap-2";
      else saveBtn.className = "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow transition flex items-center gap-2";
  }
};

window.toggleSameDeliveryAddress = () => { if(window.activeDocMode !== 'quote') return; const chk = document.getElementById('sameAddressCheckbox'); const d = document.getElementById('deliveryAddress'); const cAdd = document.getElementById('custAddress'); if(!chk || !d || !cAdd) return; if(chk.checked) { d.value = cAdd.value; d.readOnly = true; d.classList.add('bg-slate-100'); } else { d.readOnly = false; d.classList.remove('bg-slate-100'); } window.renderDocPreview(); };
window.handleCompanyAddressInput = () => { const chk = document.getElementById('sameAddressCheckbox'); const d = document.getElementById('deliveryAddress'); const cAdd = document.getElementById('custAddress'); if(chk && chk.checked && d && cAdd) { d.value = cAdd.value; window.renderDocPreview(); } };

window.resetCustomerForm = () => {
  window.currentOrderId = null; window.orderDates = null;
  ['currentCustomerId','custName','custTaxId','custCompanyPhone','custEmail','custAddress','contactPerson','custPhone','deliveryAddress', 'deliveryTime'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  const chk = document.getElementById('sameAddressCheckbox'); if(chk) chk.checked = false;
  const vat = document.getElementById('vatSelect'); if(vat) vat.value = '8';
  const dpP = document.getElementById('depositPercent'); if(dpP) dpP.value = '50';
  const dpA = document.getElementById('depositFixedAmountInput'); if(dpA) dpA.value = '0';
  window.tabItems = { quote: null, order: null, delivery: null }; window.tabItems[window.activeDocMode] = [{ name: "", unit: "Cái", qty: 1, price: 0 }]; window.itemsList = JSON.parse(JSON.stringify(window.tabItems[window.activeDocMode]));
  window.tabNotes = { quote: "- Báo giá có giá trị trong vòng 15 ngày.\n- Giá trên chưa bao gồm 8% thuế GTGT.\n- Miễn phí giao hàng nội thành TP.HCM.", order: "- Khách hàng kiểm tra và ký xác nhận duyệt nội dung, màu sắc trước khi sản xuất hàng loạt.\n- Hàng giao tận nơi theo thỏa thuận.", delivery: "- Quý khách vui lòng kiểm tra kỹ số lượng và chất lượng trước khi nhận hàng.\n- Hàng giao tận nơi theo thỏa thuận." };
  const tEl = document.getElementById('docTerms'); if(tEl) tEl.value = window.tabNotes[window.activeDocMode];
  window.initDefaultDocMeta(); window.renderItemsTable(); window.renderDocPreview(); window.showToast("Đã tạo form mới", "info");
};

window.renderItemsTable = function() {
  const tbody = document.getElementById('itemsTableBody'); if(!tbody) return; tbody.innerHTML = ''; const isPriceReadOnly = window.activeDocMode !== 'quote';
  window.itemsList.forEach((it, i) => {
    const totalVal = Math.round((it.qty || 0) * (it.price || 0));
    const formattedDisplayPrice = Number(it.price).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

    const priceInputHtml = isPriceReadOnly 
        ? `<div class="relative w-full"><i class="fa-solid fa-lock absolute left-2 top-2 text-slate-400 text-[9px]"></i><input type="text" value="${formattedDisplayPrice}" readonly class="w-full text-right pl-5 bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 rounded p-1 text-xs font-mono"></div>` 
        : `<input type="number" step="any" id="priceInput_${i}" value="${it.price}" oninput="window.updateItem(${i}, 'price', this)" class="w-full text-right bg-transparent text-blue-700 border border-slate-300 rounded p-1 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-blue-500">`;
        
    const totalInputHtml = isPriceReadOnly
        ? `<div class="text-right font-mono font-bold text-slate-700">${totalVal.toLocaleString('vi-VN')}</div>`
        : `<div class="flex items-center gap-1"><input type="number" step="any" id="totalInput_${i}" value="${totalVal}" oninput="window.updateItem(${i}, 'total', this)" class="w-full text-right bg-transparent text-rose-600 border border-slate-300 rounded p-1 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-rose-500"><button onclick="window.reverseCalc(${i})" title="Tính ngược từ giá có VAT" class="text-rose-500 hover:text-rose-700 px-1"><i class="fa-solid fa-calculator"></i></button></div>`;

    tbody.innerHTML += `
    <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
        <td class="p-2 text-center font-bold text-slate-400 align-top pt-3">${i+1}</td>
        <td class="p-2 align-top"><textarea oninput="this.style.height=''; this.style.height=this.scrollHeight+'px'; window.updateItem(${i}, 'name', this)" class="w-full bg-transparent border border-slate-300 rounded p-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden min-h-[32px] whitespace-pre-wrap leading-tight block">${it.name}</textarea></td>
        <td class="p-2 align-top pt-2"><input type="text" value="${it.unit}" oninput="window.updateItem(${i}, 'unit', this)" class="w-full text-center bg-transparent border border-slate-300 rounded p-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td class="p-2 align-top pt-2"><input type="number" step="any" id="qtyInput_${i}" value="${it.qty}" oninput="window.updateItem(${i}, 'qty', this)" class="w-full text-right bg-transparent border border-slate-300 rounded p-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"></td>
        <td class="p-2 align-top pt-2">${priceInputHtml}</td>
        <td class="p-2 align-top pt-2">${totalInputHtml}</td>
        <td class="p-2 text-center align-top pt-3"><button onclick="window.removeItemRow(${i})" class="text-rose-400 hover:text-rose-600 transition"><i class="fa-solid fa-xmark"></i></button></td>
    </tr>`;
  });
  setTimeout(() => { document.querySelectorAll('#itemsTableBody textarea').forEach(el => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }); }, 10);
  window.renderDocPreview();
};

window.updateItem = (i, f, el) => { 
    if (f === 'total') {
        const newTotal = parseFloat(el.value) || 0; const qty = window.itemsList[i].qty || 1;
        window.itemsList[i].price = Math.round((newTotal / qty) * 1000) / 1000;
        const priceEl = document.getElementById(`priceInput_${i}`); if(priceEl) priceEl.value = window.itemsList[i].price;
    } else {
        window.itemsList[i][f] = (f==='qty'||f==='price') ? parseFloat(el.value)||0 : el.value; 
        if(f === 'qty' || f === 'price') { const totalEl = document.getElementById(`totalInput_${i}`); if(totalEl) totalEl.value = Math.round(window.itemsList[i].qty * window.itemsList[i].price); } 
    }
    window.renderDocPreview(); 
};

window.reverseCalc = (i) => {
    const vatEl = document.getElementById('vatSelect'); const vat = vatEl ? parseFloat(vatEl.value) : 0;
    if(vat <= 0) { if(window.showToast) window.showToast("Chức năng này dùng khi có Thuế VAT. Vui lòng chọn VAT trước!", "info"); return; }
    const postTaxTotalStr = prompt(`Nhập TỔNG TIỀN KHÁCH TRẢ (Đã bao gồm ${vat}% VAT) cho mặt hàng này:`); if(!postTaxTotalStr) return;
    const postTaxTotal = parseFloat(postTaxTotalStr.replace(/[^\d]/g, '')); if(isNaN(postTaxTotal) || postTaxTotal <= 0) return;
    const preTaxTotal = postTaxTotal / (1 + vat / 100); const qty = window.itemsList[i].qty || 1;
    window.itemsList[i].price = Math.round((preTaxTotal / qty) * 1000) / 1000;
    window.renderItemsTable(); if(window.showToast) window.showToast("Đã bóc tách VAT và tính ngược đơn giá thành công!", "success");
};

window.addItemRow = () => { window.itemsList.push({name:"", unit:"Cái", qty:1, price:0}); window.renderItemsTable(); };
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
  return result.trim().replace(/\s+/g, ' ').replace(/^./, c => c.toUpperCase()) + " đồng chẵn.";
}

window.renderDocPreview = function() {
  const pDoc = document.getElementById('printDocument'); if(!pDoc) return;
  let subtotal = 0; window.itemsList.forEach(it => subtotal += ((parseFloat(it.qty)||0) * (parseFloat(it.price)||0))); subtotal = Math.round(subtotal); 
  const vatEl = document.getElementById('vatSelect'); const vatVal = vatEl ? parseFloat(vatEl.value) : 0; const vatAmount = vatVal > 0 ? Math.round(subtotal * (vatVal/100)) : 0; const grandTotal = subtotal + vatAmount;
  const dpPctEl = document.getElementById('depositPercent'); const dpAmtEl = document.getElementById('depositFixedAmountInput');
  let depAmount = window.depositType === 'percent' ? Math.round(grandTotal * ((parseFloat(dpPctEl?dpPctEl.value:0)||0)/100)) : parseInt((dpAmtEl?dpAmtEl.value:'0').replace(/[^\d]/g,''))||0;
  const remain = Math.max(0, grandTotal - depAmount);

  const setHtml = (id, html) => { const el = document.getElementById(id); if(el) el.innerHTML = html; };
  setHtml('displaySubtotal', subtotal.toLocaleString('vi-VN') + ' đ'); setHtml('displayVatAmount', vatAmount.toLocaleString('vi-VN') + ' đ'); setHtml('displayGrandTotal', grandTotal.toLocaleString('vi-VN') + ' đ'); setHtml('displayDepositAmount', depAmount.toLocaleString('vi-VN') + ' đ'); setHtml('displayRemainingAmount', remain.toLocaleString('vi-VN') + ' đ');
  
  let amountToSpell = grandTotal; if (window.activeDocMode === 'order' || window.activeDocMode === 'delivery') amountToSpell = remain;
  setHtml('displayAmountWords', docTienBangChu(amountToSpell)); setHtml('displayDepositWords', docTienBangChu(depAmount));

  const pSize = window.activeDocMode === 'delivery' ? window.deliveryPaperSize : (window.activeDocMode === 'order' && window.deliveryPaperSize ? window.deliveryPaperSize : 'A4');
  const dps = document.getElementById('dynamicPagePrintStyle'); const ppsb = document.getElementById('previewPaperSizeBadge');
  if(pSize === 'A6-portrait') { pDoc.className = 'a6-portrait-sheet font-document text-black'; if(dps) dps.innerHTML = '@page { size: A6 portrait; margin: 0; }'; if(ppsb) ppsb.innerText = 'Khổ A6 (In xưởng)'; } else if(pSize === 'A5-landscape') { pDoc.className = 'a5-landscape-sheet font-document text-black'; if(dps) dps.innerHTML = '@page { size: A5 landscape; margin: 0; }'; if(ppsb) ppsb.innerText = 'Khổ A5 Ngang'; } else if(pSize === 'A5-portrait') { pDoc.className = 'a5-portrait-sheet font-document text-black'; if(dps) dps.innerHTML = '@page { size: A5 portrait; margin: 0; }'; if(ppsb) ppsb.innerText = 'Khổ A5 Đứng'; } else { pDoc.className = 'a4-sheet font-document text-black'; if(dps) dps.innerHTML = '@page { size: A4 portrait; margin: 0; }'; if(ppsb) ppsb.innerText = 'Khổ A4'; }

  const cNameEl = document.getElementById('custName'); const cName = cNameEl && cNameEl.value.trim() ? cNameEl.value.trim() : '...........................................'; const taxLines = [];
  ['custTaxId','custCompanyPhone','custEmail'].forEach(id => { const el = document.getElementById(id); const val = el ? el.value.trim() : ''; if(val) taxLines.push(id==='custTaxId'?`<strong>MST:</strong> ${val}`:id==='custCompanyPhone'?`<strong>SĐT:</strong> ${val}`:`<strong>Email:</strong> ${val}`); });
  
  const getVal = (id, def) => { const el = document.getElementById(id); return el ? el.value : def; };
  const sName = getVal('sellerName', window.DEFAULT_COMPANY.name); const sAdd = getVal('sellerAddress', window.DEFAULT_COMPANY.address); const sBranch = getVal('sellerBranch', window.DEFAULT_COMPANY.branch); const sHotline = getVal('sellerPhone', window.DEFAULT_COMPANY.phone); const sTax = getVal('sellerTaxCode', window.DEFAULT_COMPANY.taxCode);
  const creatorName = getVal('docCreatorInput', window.currentAppFullName); const dTitleSel = document.getElementById('deliveryTitleSelect');
  let title = window.activeDocMode === 'quote' ? 'BẢNG BÁO GIÁ' : (window.activeDocMode === 'order' ? 'ĐƠN ĐẶT HÀNG' : (dTitleSel?dTitleSel.value:'PHIẾU GIAO HÀNG'));
  
  const dpCheck = document.getElementById('deliveryShowPriceCheckbox'); const hidePrice = (window.activeDocMode === 'delivery' && dpCheck && !dpCheck.checked) || pSize === 'A6-portrait'; const isNoSum = (window.activeDocMode === 'quote' && window.quoteSumMode === 'options');
  const isA6 = pSize === 'A6-portrait'; const isA5P = pSize === 'A5-portrait'; const isA5 = pSize !== 'A4' && !isA6;
  const fontT = isA6 ? '14px' : (isA5P ? '16px' : (isA5 ? '18px' : '21px')); const fontBase = isA6 ? '9px' : (isA5P ? '10.5px' : (isA5 ? '12px' : '13.5px')); const cellP = isA6 ? '2px 3px' : (isA5P ? '3px 4px' : '6px 8px');

  let tbodyStr = '';
  window.itemsList.forEach((it, i) => {
    const formattedName = (it.name || '').replace(/\n/g, '<br>'); const displayPrice = Number(it.price).toLocaleString('vi-VN', { maximumFractionDigits: 2 }); const displayRowTotal = Math.round((parseFloat(it.qty)||0) * (parseFloat(it.price)||0)).toLocaleString('vi-VN');
    if(hidePrice) { tbodyStr += `<tr><td style="border:1px solid #000;text-align:center;padding:${cellP};vertical-align:top;">${i+1}</td><td style="border:1px solid #000;padding:${cellP};vertical-align:top;"><strong>${formattedName}</strong></td><td style="border:1px solid #000;text-align:center;padding:${cellP};vertical-align:top;">${it.unit}</td><td style="border:1px solid #000;text-align:center;padding:${cellP};vertical-align:top;">${it.qty.toLocaleString('vi-VN')}</td>${isA6 ? '' : `<td style="border:1px solid #000;padding:${cellP}"></td>`}</tr>`; }
    else { tbodyStr += `<tr><td style="border:1px solid #000;text-align:center;padding:${cellP};vertical-align:top;">${i+1}</td><td style="border:1px solid #000;padding:${cellP};vertical-align:top;"><strong>${formattedName}</strong></td><td style="border:1px solid #000;text-align:center;padding:${cellP};vertical-align:top;">${it.unit}</td><td style="border:1px solid #000;text-align:center;padding:${cellP};vertical-align:top;">${it.qty.toLocaleString('vi-VN')}</td><td style="border:1px solid #000;text-align:right;padding:${cellP};vertical-align:top;">${displayPrice}</td><td style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP};vertical-align:top;">${displayRowTotal}</td></tr>`; }
  });
  
  const tEl = document.getElementById('docTerms'); const termsText = tEl ? tEl.value.trim() : ''; const termsHtml = termsText ? `<div style="margin-bottom:15px; white-space: pre-wrap; font-size:${isA6?'9px':(isA5?'11px':'13px')};"><strong>Ghi chú:</strong><br>${termsText}</div>` : '';
  let lblDeposit = window.activeDocMode === 'quote' ? 'Đề nghị đặt cọc:' : (window.activeDocMode === 'delivery' ? 'Đã thanh toán (Cọc):' : 'Đã thanh toán / Đặt cọc:');
  let lblRemain = window.activeDocMode === 'delivery' ? 'CẦN THU THÊM:' : 'Còn lại:';

  if(!hidePrice && !isNoSum && !isA6) {
    if(vatVal > 0) tbodyStr += `<tr><td colspan="5" style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">Cộng tiền hàng:</td><td style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">${subtotal.toLocaleString('vi-VN')}</td></tr><tr><td colspan="5" style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">Thuế VAT (${vatVal}%):</td><td style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">${vatAmount.toLocaleString('vi-VN')}</td></tr>`;
    tbodyStr += `<tr><td colspan="5" style="border:1px solid #000;text-align:right;font-weight:bold;font-size:${isA5?'11px':'14px'};padding:${cellP};color:#b91c1c;">TỔNG CỘNG THANH TOÁN:</td><td style="border:1px solid #000;text-align:right;font-weight:bold;font-size:${isA5?'11px':'14px'};padding:${cellP};color:#b91c1c;">${grandTotal.toLocaleString('vi-VN')} đ</td></tr>`;
    if(depAmount > 0) { tbodyStr += `<tr><td colspan="5" style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">${lblDeposit}</td><td style="border:1px solid #000;text-align:right;font-weight:bold;color:#1e3a8a;padding:${cellP}">${depAmount.toLocaleString('vi-VN')} đ</td></tr><tr><td colspan="5" style="border:1px solid #000;text-align:right;font-weight:bold;padding:${cellP}">${lblRemain}</td><td style="border:1px solid #000;text-align:right;font-weight:bold;color:#b91c1c;padding:${cellP}">${remain.toLocaleString('vi-VN')} đ</td></tr>`; }
  }
  
  let headerHtml = ''; const numInp = document.getElementById('docNumberInput'); const dateInp = document.getElementById('docDateInput'); const dNum = numInp ? numInp.value : ''; const dDate = dateInp ? dateInp.value : '';
  if(isA6) { headerHtml = `<div style="border-bottom: 1px solid #1e3a8a; padding-bottom: 4px; margin-bottom: 6px; text-align:center;"><div style="font-size:10px; font-weight:bold; color:#1e3a8a;">${sName}</div><div style="font-size:8px;"><strong>Hotline:</strong> <span style="color:#b91c1c;font-weight:bold;">${sHotline}</span></div></div><table style="width:100%; font-size:8px; margin-bottom:4px;"><tr><td style="text-align:left;"><strong>Số:</strong> ${dNum}</td><td style="text-align:right;"><strong>Ngày:</strong> ${dDate}</td></tr></table>`; } 
  else { headerHtml = `<div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 10px;"><table style="width:100%;"><tr><td style="width:70%;vertical-align:top;"><div style="font-size:${isA5P?'12px':'15px'}; font-weight:bold; color:#1e3a8a;">${sName}</div><div><strong>Địa chỉ:</strong> ${sAdd}</div>${sBranch ? `<div><strong>Chi nhánh:</strong> ${sBranch}</div>` : ''}<div><strong>Hotline:</strong> <span style="color:#b91c1c;font-weight:bold;">${sHotline}</span> | <strong>MST:</strong> ${sTax}</div></td><td style="width:30%;vertical-align:top;text-align:right;"><div style="border:1px solid #ccc; padding:4px; border-radius:4px; text-align:left; display:inline-block;"><div><strong>Số:</strong> ${dNum}</div><div><strong>Ngày:</strong> ${dDate}</div></div></td></tr></table></div>`; }
  
  pDoc.innerHTML = `
    <div style="font-size:${fontBase}; line-height:1.4;">
      ${headerHtml}
      <h1 style="text-align:center; font-size:${fontT}; font-weight:bold; margin: ${isA6?'6px 0':'12px 0'};">${title}</h1>
      <div style="border:1px solid #334155; padding:${isA6?'4px 6px':'6px 8px'}; margin-bottom:10px; background:#fcfcfc;">
        <div style="display:flex; margin-bottom:2px;"><span style="font-weight:bold; width:${isA6?'60px':'100px'}; flex-shrink:0;">Khách hàng:</span> <strong style="color:#1e3a8a;">${cName}</strong></div>
        ${taxLines.length > 0 && !isA6 ? `<div style="margin-bottom:2px;">${taxLines.join(' &nbsp;|&nbsp; ')}</div>` : ''}
        ${!isA6 ? `<div style="display:flex; margin-bottom:2px;"><span style="font-weight:bold; width:100px; flex-shrink:0;">Địa chỉ:</span> <span>${getVal('custAddress','')}</span></div>` : ''}
        <div style="display:flex; margin-bottom:2px;"><span style="font-weight:bold; width:${isA6?'60px':'100px'}; flex-shrink:0;">Liên hệ:</span> <span><strong style="color:#1e3a8a;">${getVal('contactPerson','')}</strong> &nbsp;|&nbsp; <strong>SĐT:</strong> <strong>${getVal('custPhone','')}</strong></span></div>
        <div style="display:flex; margin-bottom:2px;"><span style="font-weight:bold; width:${isA6?'60px':'100px'}; flex-shrink:0;">Giao hàng:</span> <span>${getVal('deliveryAddress','')}</span></div>
        ${isA6 && getVal('deliveryTime','') ? `<div style="display:flex; margin-bottom:2px;"><span style="font-weight:bold; width:60px; flex-shrink:0;">Thời gian:</span> <span>${getVal('deliveryTime','')}</span></div>` : ''}
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
  let format = 'a4'; let orientation = 'portrait'; if(pSize === 'A6-portrait') format = 'a6'; else if(pSize === 'A5-landscape') { format = 'a5'; orientation = 'landscape'; } else if(pSize === 'A5-portrait') format = 'a5';
  const opt = { margin: 0, filename: `${document.getElementById('docNumberInput').value.replace('Sẽ cấp tự động khi Lưu', 'Phieu_Moi')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, scrollY: 0 }, jsPDF: { unit: 'mm', format: format, orientation: orientation, compress: true } };
  const btn = document.getElementById('headerExportPdfBtn'); const originalText = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải PDF...';
  try { await html2pdf().set(opt).from(document.getElementById('printDocument')).save(); } catch (error) { console.error("Lỗi xuất PDF:", error); if(window.showToast) window.showToast("Lỗi khi xuất PDF!", "error"); } finally { btn.innerHTML = originalText; }
};

window.exportToImage = async function() {
  const printDoc = document.getElementById('printDocument'); if (!printDoc) return;
  const oldOverflow = printDoc.style.overflow; printDoc.style.overflow = 'visible';
  const btn = document.getElementById('headerExportImageBtn'); if(btn) { btn.dataset.originalText = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải Ảnh...'; }
  try { const canvas = await html2canvas(printDoc, { scale: 2, useCORS: true }); const link = document.createElement('a'); link.href = canvas.toDataURL('image/jpeg', 0.9); link.download = `${document.getElementById('docNumberInput').value.replace('Sẽ cấp tự động khi Lưu', 'Phieu_Moi')}.jpg`; link.click(); if(window.showToast) window.showToast("Đã tải ảnh thành công!", "success"); } catch (error) { console.error("Lỗi xuất ảnh:", error); if(window.showToast) window.showToast("Lỗi khi xuất ảnh!", "error"); } finally { printDoc.style.overflow = oldOverflow; if(btn) btn.innerHTML = btn.dataset.originalText; }
};

window.switchViewTab = (t) => { const f = document.getElementById('section-form'); const p = document.getElementById('section-preview'); if(f) f.classList.toggle('hidden', t!=='form'); if(p) p.classList.toggle('hidden', t==='form'); };
window.fitZoomScreen = () => { const z = document.getElementById('zoomWrapper'); if(z) z.style.transform = `scale(${window.innerWidth < 768 ? 0.6 : (window.innerWidth < 1280 ? 0.8 : 0.92)})`; };

window.saveOrderToCloud = async () => {
  if (window.tabItems && window.itemsList) { window.tabItems[window.activeDocMode] = JSON.parse(JSON.stringify(window.itemsList)); const termsEl = document.getElementById('docTerms'); if(termsEl) window.tabNotes[window.activeDocMode] = termsEl.value; }
  const isNew = !window.currentOrderId;
  if (isNew) { const now = new Date(); const pfx = window.activeDocMode === 'quote' ? 'BG' : (window.activeDocMode === 'order' ? 'ĐH' : 'GH'); const num = `${now.getFullYear()}${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`; window.currentOrderId = `${pfx}-${num}`; window.currentOrderDate = now.toLocaleDateString('vi-VN'); if(!window.orderDates) window.orderDates = { quote: window.currentOrderDate, order: null, delivery: null }; }
  if (window.orderDates && !window.orderDates[window.activeDocMode]) window.orderDates[window.activeDocMode] = new Date().toLocaleDateString('vi-VN');
  let orderData = { mode: window.activeDocMode, date: window.currentOrderDate, customerName: document.getElementById('custName').value, taxId: document.getElementById('custTaxId').value, companyPhone: document.getElementById('custCompanyPhone').value, email: document.getElementById('custEmail').value, address: document.getElementById('custAddress').value, contactPerson: document.getElementById('contactPerson').value, phone: document.getElementById('custPhone').value, deliveryAddress: document.getElementById('deliveryAddress').value, deliveryTime: document.getElementById('deliveryTime').value, sameAddress: document.getElementById('sameAddressCheckbox').checked, customerId: document.getElementById('currentCustomerId').value, items: JSON.parse(JSON.stringify(window.itemsList || [])), tabItems: JSON.parse(JSON.stringify(window.tabItems || {})), tabNotes: JSON.parse(JSON.stringify(window.tabNotes || {})), orderDates: window.orderDates, total: (document.getElementById('displayGrandTotal') ? document.getElementById('displayGrandTotal').innerText.replace(' đ', '') : '0'), quoteSumMode: window.quoteSumMode, depositType: window.depositType, depositPercent: document.getElementById('depositPercent') ? document.getElementById('depositPercent').value : 0, depositAmount: document.getElementById('depositFixedAmountInput') ? document.getElementById('depositFixedAmountInput').value : 0, terms: document.getElementById('docTerms') ? document.getElementById('docTerms').value : '', vat: document.getElementById('vatSelect') ? document.getElementById('vatSelect').value : 0 };
  let orders = JSON.parse(window.SafeStore.get('docugen_orders') || '{}'); orders[window.currentOrderId] = orderData; window.SafeStore.set('docugen_orders', JSON.stringify(orders)); if(window.initDefaultDocMeta) window.initDefaultDocMeta(); if(window.renderDocPreview) window.renderDocPreview(); window.showToast(`Đã lưu Phiếu: ${window.currentOrderId}`, "success");
  let jsonPayload = JSON.stringify({ taxId: orderData.taxId, companyPhone: orderData.companyPhone, email: orderData.email, address: orderData.address, contactPerson: orderData.contactPerson, phone: orderData.phone, deliveryAddress: orderData.deliveryAddress, deliveryTime: orderData.deliveryTime, sameAddress: orderData.sameAddress, customerId: orderData.customerId, items: orderData.items, tabItems: orderData.tabItems, tabNotes: orderData.tabNotes, orderDates: orderData.orderDates, quoteSumMode: orderData.quoteSumMode, depositType: orderData.depositType, depositPercent: orderData.depositPercent, depositAmount: orderData.depositAmount, terms: orderData.terms, vat: orderData.vat });
  await window.cloudSync('SAVE_ORDER', { MaPhieu: window.currentOrderId, NgayLap: window.currentOrderDate, TenKH: orderData.customerName, LoaiPhieu: orderData.mode, TongTien: orderData.total, Data_JSON: jsonPayload });
};
