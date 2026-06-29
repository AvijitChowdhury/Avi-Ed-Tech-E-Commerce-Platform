import { Link } from "@tanstack/react-router";
import { GraduationCap, Shield, Truck, RefreshCw, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card/40">
      <div className="container mx-auto px-4 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="gradient-primary-bg flex h-9 w-9 items-center justify-center rounded-lg">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">
              Avi<span className="gradient-text">EdTech</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Recorded courses and hands-on labs from industry experts. Lifetime access, real outcomes.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/products" className="hover:text-primary">All courses</Link></li>
            <li><Link to="/products" search={{ type: "lab" } as any} className="hover:text-primary">Hands-on labs</Link></li>
            <li><Link to="/categories/cybersecurity" className="hover:text-primary">Cybersecurity</Link></li>
            <li><Link to="/categories/machine-learning" className="hover:text-primary">Machine Learning</Link></li>
            <li><Link to="/categories/web-development" className="hover:text-primary">Web Development</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Help</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/track" className="hover:text-primary">Track order</Link></li>
            <li><Link to="/account" className="hover:text-primary">My account</Link></li>
            <li><a className="hover:text-primary">Refund policy</a></li>
            <li><a className="hover:text-primary">Terms</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Promise</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><Shield className="h-4 w-4 text-primary mt-0.5" /> 30-day money-back guarantee</li>
            <li className="flex gap-2"><Truck className="h-4 w-4 text-primary mt-0.5" /> Instant delivery on courses</li>
            <li className="flex gap-2"><RefreshCw className="h-4 w-4 text-primary mt-0.5" /> Lifetime free updates</li>
            <li className="flex gap-2"><Mail className="h-4 w-4 text-primary mt-0.5" /> support@aviedtech.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} AviEdTech — All rights reserved.
      </div>
    </footer>
  );
}
