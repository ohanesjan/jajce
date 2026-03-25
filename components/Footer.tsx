export function Footer() {
  return (
    <footer className="border-t border-soil/10 bg-[#efe6d6]">
      <div className="section-shell flex flex-col gap-6 py-10 text-sm text-bark/70 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-serif text-2xl text-bark">Jajce</p>
          <p className="mt-2 uppercase tracking-[0.18em] text-soil/70">
            Mountain eggs, naturally raised
          </p>
        </div>
        <div className="space-y-1 text-left md:text-right">
          <p>Contact placeholder</p>
          <p>&copy; 2026 Jajce. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
