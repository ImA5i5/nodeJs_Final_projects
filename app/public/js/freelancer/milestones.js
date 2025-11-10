// app/public/js/freelancer/milestones.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("Freelancer Milestones JS Loaded ✅");

  /* ----------------------------------------------------
     ✅ START WORK
  ---------------------------------------------------- */
  document.querySelectorAll(".start-work-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const ok = await Swal.fire({
        title: "Start this milestone?",
        text: "You will begin working and the client will see progress.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Start Work",
        confirmButtonColor: "#16a34a"
      });

      if (!ok.isConfirmed) return;

      const res = await fetch(`/milestone/${id}/start`, {
        method: "POST"
      });

      const data = await res.json();

      Swal.fire(
        data.success ? "✅ Work Started" : "❌ Error",
        data.message,
        data.success ? "success" : "error"
      ).then(() => data.success && location.reload());
    });
  });


  /* ----------------------------------------------------
     ✅ OPEN SUBMIT MODAL
  ---------------------------------------------------- */
  document.querySelectorAll(".open-submit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      window.CURRENT_MILESTONE = btn.dataset.id;
      document.getElementById("submitModal").classList.remove("hidden");
    });
  });

  // Close modal (optional safety)
  window.closeSubmitModal = () => {
    document.getElementById("submitModal").classList.add("hidden");
  };


  /* ----------------------------------------------------
     ✅ SUBMIT DELIVERABLES (FILES)
  ---------------------------------------------------- */
  const submitBtn = document.getElementById("submitWorkBtn");

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const files = document.getElementById("submitFiles").files;

      if (!files.length) {
        return Swal.fire("❌ No File", "Please upload at least one file", "error");
      }

      let form = new FormData();
      [...files].forEach(f => form.append("files", f));

      const id = window.CURRENT_MILESTONE;

      const res = await fetch(`/milestone/${id}/submit`, {
        method: "POST",
        body: form
      });

      const data = await res.json();

      Swal.fire(
        data.success ? "✅ Submitted" : "❌ Error",
        data.message,
        data.success ? "success" : "error"
      ).then(() => data.success && location.reload());
    });
  }


  /* ----------------------------------------------------
     ✅ RESUME WORK AFTER REVISION
  ---------------------------------------------------- */
  document.querySelectorAll(".resume-work-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const ok = await Swal.fire({
        title: "Resume work?",
        text: "The client requested revisions. Continue working now.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#eab308"
      });

      if (!ok.isConfirmed) return;

      const res = await fetch(`/milestone/${id}/resume`, {
        method: "POST"
      });

      const data = await res.json();

      Swal.fire(
        data.success ? "✅ Resumed" : "❌ Error",
        data.message,
        data.success ? "success" : "error"
      ).then(() => data.success && location.reload());
    });
  });


  /* ----------------------------------------------------
     ✅ VIEW DELIVERABLES (FILES)
  ---------------------------------------------------- */
  document.querySelectorAll(".view-deliverables-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const files = JSON.parse(btn.dataset.files || "[]");

      const html = files.length
        ? files.map(u =>
            `<a href="${u}" target="_blank" class="block text-blue-600 underline">
              ${u.split('/').pop()}
            </a>`
          ).join("")
        : "No files uploaded.";

      Swal.fire({
        title: "📎 Deliverables",
        html,
        confirmButtonText: "Close"
      });
    });
  });

});
