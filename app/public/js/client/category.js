document.addEventListener("DOMContentLoaded", () => {
  const categorySelect = document.getElementById("categorySelect");
  const subcategorySelect = document.getElementById("subcategorySelect");

  if (!categorySelect) return;

  categorySelect.addEventListener("change", async () => {
    const categoryId = categorySelect.value;
    subcategorySelect.innerHTML = `<option value="">Loading...</option>`;

    if (!categoryId) {
      subcategorySelect.innerHTML = `<option value="">Select Subcategory</option>`;
      return;
    }

    const res = await fetch(`/category/${categoryId}/subcategories`);
    const data = await res.json();

    if (!data.success) {
      subcategorySelect.innerHTML = `<option value="">No Subcategories Found</option>`;
      return;
    }

    subcategorySelect.innerHTML = `<option value="">Select Subcategory</option>`;

    data.subcategories.forEach(sub => {
      subcategorySelect.innerHTML += `
        <option value="${sub.name}">${sub.name}</option>
      `;
    });
  });
});
