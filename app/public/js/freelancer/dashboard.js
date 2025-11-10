// app/public/js/freelancer/dashboard.jsdocument.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("DOMContentLoaded", () => {
  const data = window.DASHBOARD_DATA || {};
  const rating = data.rating || 0;
  const monthlyEarnings = data.monthlyEarnings || [];

  // ✅ RATING BAR WIDTH
  const ratingBar = document.getElementById("rating-bar");
  if (ratingBar) {
    ratingBar.style.width = (rating * 20) + "%";   // 5 ⭐ = 100%
  }

  // ✅ EARNINGS CHART
  const ctx = document.getElementById("earningsChart");
  if (ctx) {
    new Chart(ctx, {
      type: "line",
      data: {
        labels: [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ],
        datasets: [
          {
            label: "Earnings (₹)",
            data: monthlyEarnings,
            borderWidth: 3,
            borderColor: "rgb(34,197,94)",
            backgroundColor: "rgba(34,197,94,0.15)",
            fill: true,
            tension: 0.25,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
});
