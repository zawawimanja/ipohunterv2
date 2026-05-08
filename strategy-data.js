const STRATEGY_DATA = {
    backtest: [
        { year: "2019", a: "34.1% (1)", b: "+194.4% (8)", c: "+70.9% (6)" },
        { year: "2020", a: "12.5% (1)", b: "+552.5% (7)", c: "-28.0% (4)" },
        { year: "2021", a: "48.5% (2)", b: "+986.5% (11)", c: "+13.3% (3)" },
        { year: "2022", a: "68.0% (2)", b: "+1152.2% (16)", c: "-60.5% (12)" },
        { year: "2023", a: "103.4% (2)", b: "+2028.9% (22)", c: "-59.2% (7)" },
        { year: "2024", a: "241.2% (7)", b: "+1780.1% (35)", c: "-3.8% (9)" },
        { year: "2025", a: "10.6% (2)", b: "+888.8% (25)", c: "-137.5% (27)" },
        { year: "2026", a: "74.4% (2)", b: "+294.9% (9)", c: "-32.8% (6)" }
    ],
    totals: { a: "+592.7%", b: "+7878.4%", c: "-237.7%" },
    multiplier: 78.784, // Based on Grade B total
    projections: [
        { amt: 1000, label: "Starter" },
        { amt: 3000, label: "Comfortable (Basic Living)" },
        { amt: 5000, label: "Good Life" },
        { amt: 10000, label: "Premium Lifestyle" },
        { amt: 12693, label: "MILLIONAIRE GOAL", highlight: true }, // 1M / 78.784
        { amt: 20000, label: "Financial Freedom" }
    ]
};
