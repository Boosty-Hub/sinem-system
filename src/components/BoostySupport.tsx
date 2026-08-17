import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/AuthContext";

/** Id of the element the Boosty widget mounts its button into, targeted by `data-boosty-mount`. */
export const BOOSTY_MOUNT_ID = "boosty-support-mount";

const SCRIPT_SRC = "https://portal.boosty.digital/boosty-support.js";
const BOOSTY_KEY = "bw_pk_e88d4859158ccf9257fb83db9b1a726d";

/** The mount element is deliberately NOT React-rendered.
 *
 *  The widget appends its shadow host into this element exactly once, then disconnects the
 *  MutationObserver that was watching for it — it never looks again. React destroys the header
 *  whenever /configuracion renders, which is outside AppLayout, so a React-owned div would come
 *  back empty and the app would sit with no support button until a full page reload. Owning the
 *  node at module scope and re-parenting it on every mount carries the widget's button through
 *  that round trip untouched. */
let mountEl: HTMLDivElement | null = null;
const getMountEl = () => {
  if (!mountEl) {
    mountEl = document.createElement("div");
    mountEl.id = BOOSTY_MOUNT_ID;
    mountEl.className = "flex items-center";
  }
  return mountEl;
};

/** The widget reads its `data-*` attributes once, when the script loads, so injecting the tag
 *  from React rather than from index.html is what lets those attributes carry the signed-in
 *  user: a static tag in the document runs before Supabase has resolved the session and could
 *  only ever leave the popup asking for a name and email the app already knows.
 *
 *  It also keeps the widget off the pages that have no header. Given a mount selector it cannot
 *  find, the script waits 10s and then falls back to a floating button — which is precisely what
 *  this integration must never render. */
let injected = false;

/** Support ticket button, rendered inside the app header. */
const BoostySupport = () => {
  const { user } = useAuth();
  const anchorRef = useRef<HTMLSpanElement>(null);

  // Re-parent the persistent mount node on every mount, before the injection effect below runs,
  // so the script finds its target synchronously instead of racing the observer.
  useEffect(() => {
    anchorRef.current?.appendChild(getMountEl());
  }, []);

  useEffect(() => {
    if (injected || !user) return;
    let cancelled = false;

    // Injected on both the resolved and the failed path: a profile lookup that fails is a
    // reason for the popup to ask for a name, never a reason to lose support altogether.
    const inject = (name: string) => {
      if (cancelled || injected) return;
      injected = true;

      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.dataset.boostyKey = BOOSTY_KEY;
      script.dataset.boostyMount = `#${BOOSTY_MOUNT_ID}`;
      if (name) script.dataset.boostyUserName = name;
      if (user.email) script.dataset.boostyUserEmail = user.email;
      document.body.appendChild(script);
    };

    // `app_users.name` is the display name; the auth record only carries the email.
    supabase
      .from("app_users")
      .select("name")
      .eq("auth_user_id", user.id)
      .maybeSingle()
      .then(
        ({ data }) => inject(data?.name ?? ""),
        () => inject("")
      );

    return () => {
      cancelled = true;
    };
  }, [user]);

  return <span ref={anchorRef} className="flex items-center" />;
};

export default BoostySupport;
