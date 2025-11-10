// ✅ app/public/js/client/milestones.js
console.log("✅ milestones.js loaded");

// Global vars from EJS:
// window.PROJECT_ID
// window.RZP_KEY


document.addEventListener("DOMContentLoaded", () => {

  /* ----------------------------------------------------
     ✅ 1. CREATE MILESTONE
  -----------------------------------------------------*/
  const createBtn = document.getElementById("btnCreate");

  if (createBtn) {
    createBtn.addEventListener("click", async () => {
      const { value: form } = await Swal.fire({
        title: "Create Milestone",
        html: `
          <input id="msTitle" class="swal2-input" placeholder="Title" />
          <input id="msAmount" class="swal2-input" type="number" placeholder="Amount (₹)" />
          <input id="msDue" class="swal2-input" type="date" />
          <textarea id="msDesc" class="swal2-textarea" placeholder="Description"></textarea>
        `,
        showCancelButton: true,
        confirmButtonText: "Create",
        preConfirm: () => {
          const title = document.getElementById("msTitle").value.trim();
          const amount = Number(document.getElementById("msAmount").value);
          const dueDate = document.getElementById("msDue").value;
          const description = document.getElementById("msDesc").value;

          if (!title || !amount)
            return Swal.showValidationMessage("Title & Amount required");

          return { title, amount, dueDate, description };
        }
      });

      if (!form) return;

      const res = await fetch(`/milestone/${window.PROJECT_ID}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      Swal.fire(
        data.success ? "✅ Milestone Created" : "❌ Error",
        data.message || "",
        data.success ? "success" : "error"
      ).then(() => data.success && location.reload());
    });
  }



  /* ----------------------------------------------------
     ✅ 2. FUND MILESTONE WITH RAZORPAY
  -----------------------------------------------------*/
  document.querySelectorAll(".fundBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const milestoneId = btn.dataset.id;
      const amount = Number(btn.dataset.amount);

      if (!window.RZP_KEY) {
        return Swal.fire("❌ Missing Razorpay Key", "Contact admin.", "error");
      }

      const orderRes = await fetch("/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, amount }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        return Swal.fire("❌ Error", orderData.message, "error");
      }

      const options = {
        key: window.RZP_KEY,
        amount: orderData.order.amount,
        currency: "INR",
        name: "Freelancer Marketplace",
        description: "Milestone Funding",
        order_id: orderData.order.id,

        handler: async function (resp) {
          const verifyRes = await fetch("/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_signature: resp.razorpay_signature,
              milestoneId,
              amount,
            }),
          });

          const verifyData = await verifyRes.json();
          Swal.fire(
            verifyData.success ? "✅ Funded" : "❌ Error",
            verifyData.message,
            verifyData.success ? "success" : "error"
          ).then(() => verifyData.success && location.reload());
        },
      };

      new Razorpay(options).open();
    });
  });



  /* ----------------------------------------------------
     ✅ 3. APPROVE & RELEASE PAYMENT
  -----------------------------------------------------*/
  document.querySelectorAll(".approveBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const ok = await Swal.fire({
        title: "Release payment?",
        icon: "question",
        showCancelButton: true,
      });

      if (!ok.isConfirmed) return;

      const res = await fetch(`/milestone/${id}/release`, {
        method: "POST",
      });

      const data = await res.json();

      Swal.fire(
        data.success ? "✅ Released" : "❌ Error",
        data.message,
        data.success ? "success" : "error"
      ).then(() => data.success && location.reload());
    });
  });



  /* ----------------------------------------------------
     ✅ 4. REQUEST REVISION
  -----------------------------------------------------*/
  document.querySelectorAll(".reviseBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const { value: note } = await Swal.fire({
        title: "Request Revision",
        input: "textarea",
        inputLabel: "Explain what changes are needed",
        showCancelButton: true,
      });

      if (!note) return;

      const res = await fetch(`/milestone/${id}/request-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });

      const data = await res.json();

      Swal.fire(
        data.success ? "✏️ Revision Requested" : "❌ Error",
        data.message,
        data.success ? "success" : "error"
      ).then(() => data.success && location.reload());
    });
  });



  /* ----------------------------------------------------
     ✅ 5. OPEN DISPUTE
  -----------------------------------------------------*/
  document.querySelectorAll(".disputeBtn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const id = btn.dataset.id;

    const { value: reason } = await Swal.fire({
      title: "Open Dispute",
      input: "textarea",
      inputLabel: "Why are you raising a dispute?",
      showCancelButton: true,
      inputPlaceholder: "Explain your issue clearly..."
    });

    if (!reason) return;

    const res = await fetch(`/milestone/${id}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });

    const data = await res.json();

    Swal.fire(
      data.success ? "✅ Dispute Opened" : "❌ Error",
      data.message,
      data.success ? "success" : "error"
    ).then(() => data.success && location.reload());
  });
});



  /* ----------------------------------------------------
     ✅ 6. VIEW DELIVERABLES
  -----------------------------------------------------*/
  document.querySelectorAll(".view-deliverables-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const files = JSON.parse(btn.dataset.files || "[]");

      const html =
        files.length > 0
          ? files
              .map(
                (u) =>
                  `<a href="${u}" target="_blank" class="block text-blue-600 underline">${u.split("/").pop()}</a>`
              )
              .join("")
          : "No files uploaded.";

      Swal.fire({
        title: "Deliverables",
        html,
        confirmButtonText: "Close",
      });
    });
  });

});
