import { Link } from "react-router-dom";

const URL = "https://nightingaleheart.com";

export const Footer = () => {
  return (
    <footer className="border-t bg-muted/30 transition-all duration-500 hover:bg-muted/65 hover:shadow-[inset_0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Single row layout */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src="logo-wordmark.png"
              alt="Nightingale"
              className="h-10 w-auto"
            />
          </div>

          {/* Contact info */}
          <div className="text-sm text-muted-foreground">
            Frankfurt, Germany • {" "}
            <a
              href="mailto:info@nightingaleheart.com"
              className="hover:text-primary transition-colors"
            >
              info@nightingaleheart.com
            </a>
          </div>

          {/* Social icons */}
          <div className="flex gap-4 text-muted-foreground">
            <a
              href="https://x.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on X"
              className="hover:text-primary transition-colors"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/company/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on LinkedIn"
              className="hover:text-primary transition-colors"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Bottom row: copyright + legal links */}
        <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground text-center sm:text-left">
          <p>© {new Date().getFullYear()} Nightingale Project. All rights reserved.</p>
          
          <div className="flex gap-6">
            <Link
              to={`${URL}/privacy`}
              className="hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to={`${URL}/terms`}
              className="hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to={`${URL}/cookies`}
              className="hover:text-primary transition-colors"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}