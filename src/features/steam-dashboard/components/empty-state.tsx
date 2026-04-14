export function EmptyState() {
  return (
    <section className="glass-card rounded-[28px] p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#9bdcff]">
        Ready to search
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
        Pull a Steam profile into the dashboard
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
        Use the search bar above with either a Steam ID64 or a custom profile
        name from a URL like <code>steamcommunity.com/id/gaben</code>.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "Live Steam data",
            body: "Profile details, library size, recent activity, and top-played games come from Steam Web API responses.",
          },
          {
            title: "Shareable URLs",
            body: "Every search updates the page URL, so the loaded profile is easy to refresh or bookmark.",
          },
          {
            title: "Realistic dashboard styling",
            body: "This layout follows the mock's darker Steam-inspired product feel while staying backed by your own data model.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="glass-card-soft rounded-2xl p-5"
          >
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
