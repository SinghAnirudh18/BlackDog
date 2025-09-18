export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-silver-secondary">
        <p className="">© {new Date().getFullYear()} NeonRent. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-silver-primary transition-colors ease-smooth">Privacy</a>
          <a href="#" className="hover:text-silver-primary transition-colors ease-smooth">Terms</a>
          <a href="#" className="hover:text-silver-primary transition-colors ease-smooth">Status</a>
        </div>
      </div>
    </footer>
  );
}

