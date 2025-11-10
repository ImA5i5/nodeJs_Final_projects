// app/public/js/admin/disputes.js

document.querySelectorAll(".viewDispute").forEach(btn => {
  btn.addEventListener("click", async () => {
    const id = btn.dataset.id;

    const res = await fetch(`/admin/disputes/${id}`);
    const data = await res.json();

    if (!data.success) {
      return Swal.fire("❌ Error", data.message, "error");
    }

    const d = data.dispute;

    document.getElementById("modalContent").innerHTML = `
      <p><b>Milestone:</b> ${d.milestone.title}</p>
      <p><b>Raised By:</b> ${d.raisedBy.fullName}</p>
      <p><b>Reason:</b> ${d.reason}</p>
      <p><b>Status:</b> ${d.status}</p>
    `;

    document.getElementById("submitResolution").dataset.id = d._id;

    document.getElementById("disputeModal").classList.remove("hidden");
  });
});


/* ✅ Close Modal */
function closeDisputeModal() {
  document.getElementById("disputeModal").classList.add("hidden");
}


/* ✅ Submit Admin Resolution */
document.getElementById("submitResolution").addEventListener("click", async (e) => {
  const id = e.target.dataset.id;
  const resolution = document.getElementById("resolutionSelect").value;
  const adminNote = document.getElementById("adminNote").value.trim();

  const res = await fetch(`/admin/disputes/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ disputeId: id, decision: resolution, adminNote })
  });

  const data = await res.json();

  Swal.fire(
    data.success ? "✅ Success" : "❌ Error",
    data.message,
    data.success ? "success" : "error"
  ).then(() => data.success && location.reload());
});
