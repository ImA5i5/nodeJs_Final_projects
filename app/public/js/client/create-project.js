document.getElementById("createProjectForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = new FormData(e.target);

  Swal.fire({
    title: "Creating project...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const res = await fetch("/project/create", {
    method: "POST",
    body: form
  });

  const data = await res.json();

  if (!data.success) {
    return Swal.fire("❌ Error", data.message, "error");
  }

  Swal.fire("✅ Created!", data.message, "success");
  
  setTimeout(() => {
    window.location.href = "/project/projects"; // your client project list URL
  }, 1200);
});
