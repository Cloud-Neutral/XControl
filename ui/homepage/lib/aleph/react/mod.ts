import type { AnchorHTMLAttributes, PropsWithChildren } from "react";
import { forwardRef } from "react";

export type LinkProps = PropsWithChildren<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
  }
>;

/**
 * Minimal replacement for Aleph's `Link` component. It simply renders a native
 * anchor element while preserving the expected props so existing JSX continues
 * to type-check.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { children, prefetch: _prefetch, ...props },
  ref,
) {
  return (
    <a ref={ref} {...props}>
      {children}
    </a>
  );
});

export type NavLinkProps = LinkProps & {
  activeClassName?: string;
  inactiveClassName?: string;
  exact?: boolean;
};

/**
 * Basic NavLink implementation that applies the `activeClassName` when the
 * current location matches the target href. The behaviour intentionally mirrors
 * typical client-side routing libraries but avoids any external dependencies.
 */
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { activeClassName, inactiveClassName, className, href, exact, ...props },
  ref,
) {
  let resolvedClassName = className ?? "";
  if (typeof window !== "undefined") {
    const current = window.location.pathname;
    const isActive = exact ? current === href : current.startsWith(href);
    if (isActive && activeClassName) {
      resolvedClassName = `${resolvedClassName} ${activeClassName}`.trim();
    } else if (!isActive && inactiveClassName) {
      resolvedClassName = `${resolvedClassName} ${inactiveClassName}`.trim();
    }
  }

  return (
    <Link ref={ref} href={href} className={resolvedClassName} {...props}>
      {props.children}
    </Link>
  );
});
