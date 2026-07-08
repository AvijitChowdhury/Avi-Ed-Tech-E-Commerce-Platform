import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, Beaker, Video, Users, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const URL = "https://avi-ed-tech.lovable.app/blog/top-hands-on-tech-learning-platforms";
const TITLE = "Top hands-on tech courses: comparing 6 learning platforms (2026)";
const DESCRIPTION =
  "A practical comparison of the top hands-on tech learning platforms — Coursera, Udemy, Pluralsight, Codecademy, DataCamp and AviEdTech. See how live labs, project work and mentor access change retention, and which platform fits your goal.";
const PUBLISHED = "2026-07-08";

const PLATFORMS = [
  {
    name: "AviEdTech",
    tag: "Hybrid: video + live labs",
    liveLabs: true,
    projects: true,
    mentor: true,
    lifetime: true,
    price: "$",
    best: "Career switchers who need retention, not just certificates",
    highlight: true,
  },
  {
    name: "Coursera",
    tag: "University-style courses",
    liveLabs: false,
    projects: true,
    mentor: false,
    lifetime: false,
    price: "$$",
    best: "Learners who value university branding",
  },
  {
    name: "Udemy",
    tag: "Video marketplace",
    liveLabs: false,
    projects: false,
    mentor: false,
    lifetime: true,
    price: "$",
    best: "Beginners exploring a topic on a budget",
  },
  {
    name: "Pluralsight",
    tag: "Enterprise video library",
    liveLabs: true,
    projects: false,
    mentor: false,
    lifetime: false,
    price: "$$$",
    best: "Enterprise teams doing skill assessments",
  },
  {
    name: "Codecademy",
    tag: "Interactive lessons",
    liveLabs: true,
    projects: true,
    mentor: false,
    lifetime: false,
    price: "$$",
    best: "Absolute beginners in web / Python",
  },
  {
    name: "DataCamp",
    tag: "Data-science tracks",
    liveLabs: true,
    projects: true,
    mentor: false,
    lifetime: false,
    price: "$$",
    best: "Analysts learning Python/R and SQL",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: TITLE,
  description: DESCRIPTION,
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  mainEntityOfPage: URL,
  author: { "@type": "Organization", name: "AviEdTech" },
  publisher: {
    "@type": "Organization",
    name: "AviEdTech",
    logo: {
      "@type": "ImageObject",
      url: "https://avi-ed-tech.lovable.app/favicon.ico",
    },
  },
  about: [
    { "@type": "Thing", name: "hands-on tech courses" },
    { "@type": "Thing", name: "online learning platforms" },
    { "@type": "Thing", name: "live labs" },
  ],
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://avi-ed-tech.lovable.app/" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://avi-ed-tech.lovable.app/blog" },
    { "@type": "ListItem", position: 3, name: TITLE, item: URL },
  ],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What are hands-on tech courses?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Hands-on tech courses combine short video lessons with live, in-browser labs where you write real code, break things, and fix them. They replace watch-only tutorials with active practice, which is how skills actually stick.",
      },
    },
    {
      "@type": "Question",
      name: "Why are live labs better than video-only courses?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Research on active recall and applied practice consistently shows higher retention than passive video watching. Live labs force you to type, debug and ship — the same loop you'll use on the job — so the skill transfers instead of fading after the course ends.",
      },
    },
    {
      "@type": "Question",
      name: "Which platform is best for career switchers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For career switchers, look for a hybrid platform that offers project-based work, mentor access and lifetime access to updates. AviEdTech was built around this combination — recorded courses paired with real labs and human feedback.",
      },
    },
  ],
};

export const Route = createFileRoute("/_public/blog/top-hands-on-tech-learning-platforms")({
  component: BlogPost,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "keywords", content: "hands-on tech courses, live labs, online learning platforms, tech course comparison, best coding platform" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { property: "article:published_time", content: PUBLISHED },
      { property: "article:section", content: "Learning" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(jsonLd) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumbLd) },
      { type: "application/ld+json", children: JSON.stringify(faqLd) },
    ],
  }),
});

function Row({ v }: { v: boolean }) {
  return v ? (
    <Check className="h-5 w-5 text-primary mx-auto" aria-label="Yes" />
  ) : (
    <X className="h-5 w-5 text-muted-foreground/60 mx-auto" aria-label="No" />
  );
}

function BlogPost() {
  return (
    <article className="container mx-auto px-4 py-12 max-w-4xl">
      <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        <span>Blog</span>
        <span className="mx-2">/</span>
        <span className="text-foreground">Hands-on tech platforms</span>
      </nav>

      <header className="mb-10">
        <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">
          Learning · 12 min read · Updated July 2026
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-6">
          The best hands-on tech courses in 2026: 6 platforms compared
        </h1>
        <p className="text-lg text-muted-foreground">
          If you're evaluating where to invest weeks (or months) of your life on
          hands-on tech courses, the platform you pick matters more than the
          topic. Here's an honest comparison of the six most common options —
          and why a hybrid of recorded lessons plus live labs beats video-only
          every time.
        </p>
      </header>

      <section className="prose prose-neutral dark:prose-invert max-w-none mb-12">
        <h2>Why "watch-only" courses fail most learners</h2>
        <p>
          Video-only courses feel productive. You finish a 40-hour Kubernetes
          series, tick the certificate, and a month later can't remember the
          <code> kubectl</code> command to roll back a deployment. That's not a
          motivation problem — it's how memory works. Passive viewing has one of
          the lowest retention rates of any learning modality. Applied practice
          and teaching-back have the highest.
        </p>
        <p>
          The platforms that consistently produce job-ready engineers all share
          three ingredients: <strong>short recorded lessons</strong> for
          reference,{" "}
          <strong>live labs</strong> where you break and fix real systems, and{" "}
          <strong>humans</strong> to unblock you when you're stuck. Missing any
          one of the three and completion rates collapse.
        </p>
      </section>

      <section aria-labelledby="comparison" className="mb-12">
        <h2 id="comparison" className="font-display text-3xl font-bold mb-6">
          Platform comparison
        </h2>
        <div className="overflow-x-auto card-elevated rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-4 font-semibold">Platform</th>
                <th className="p-4 font-semibold text-center">Live labs</th>
                <th className="p-4 font-semibold text-center">Project work</th>
                <th className="p-4 font-semibold text-center">Mentor access</th>
                <th className="p-4 font-semibold text-center">Lifetime access</th>
                <th className="p-4 font-semibold text-center">Price</th>
                <th className="p-4 font-semibold">Best for</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORMS.map((p) => (
                <tr
                  key={p.name}
                  className={`border-t border-border ${p.highlight ? "bg-primary/5" : ""}`}
                >
                  <td className="p-4">
                    <div className="font-semibold">
                      {p.name}{" "}
                      {p.highlight && (
                        <span className="ml-1 text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                          Our pick
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.tag}</div>
                  </td>
                  <td className="p-4 text-center"><Row v={p.liveLabs} /></td>
                  <td className="p-4 text-center"><Row v={p.projects} /></td>
                  <td className="p-4 text-center"><Row v={p.mentor} /></td>
                  <td className="p-4 text-center"><Row v={p.lifetime} /></td>
                  <td className="p-4 text-center font-medium">{p.price}</td>
                  <td className="p-4 text-muted-foreground">{p.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Data compiled from public pricing and product pages, July 2026. Feature
          availability varies by plan.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          { icon: Beaker, title: "Live labs win on retention", body: "Typing real commands into a live sandbox activates recall in a way videos can't. Every AviEdTech course ships with a paired lab kit." },
          { icon: Video, title: "Video is a reference layer", body: "Recorded lessons are perfect for revisiting a concept before an interview. They're a supplement to practice, not a replacement." },
          { icon: Users, title: "Humans unblock humans", body: "Weekly mentor office hours cut the time-to-first-project from months to days — the single biggest completion lever we measure." },
        ].map((f) => (
          <div key={f.title} className="card-elevated rounded-2xl p-6">
            <f.icon className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="prose prose-neutral dark:prose-invert max-w-none mb-12">
        <h2>How to pick the right platform for you</h2>
        <ul>
          <li>
            <strong>Just exploring a topic?</strong> A Udemy course is fine.
            Low cost, low commitment.
          </li>
          <li>
            <strong>Building for a portfolio?</strong> Look for project-based
            work — Codecademy, DataCamp or AviEdTech.
          </li>
          <li>
            <strong>Switching careers?</strong> You need labs <em>and</em>{" "}
            mentors. Only a hybrid platform delivers both — this is where
            AviEdTech was designed to win.
          </li>
          <li>
            <strong>Upskilling an enterprise team?</strong> Pluralsight's
            assessments are still the standard for large orgs.
          </li>
        </ul>

        <h2>Why AviEdTech takes a hybrid approach</h2>
        <p>
          Every AviEdTech program is built as a{" "}
          <em>recorded course + hands-on lab kit + weekly mentor office hours</em>{" "}
          bundle. You watch the concept, ship it in the lab, and get feedback
          from someone who has done it in production. Once you buy a course you
          keep lifetime access to updates — no subscription resetting your
          progress every year.
        </p>
        <p>
          Concretely, that shows up as{" "}
          <Link to="/products/llm-engineering" className="text-primary underline">
            the LLM Engineering Bootcamp
          </Link>{" "}
          (RAG + agents lab), {" "}
          <Link to="/products/cyber-soc-lab" className="text-primary underline">
            the Cyber SOC Lab
          </Link>{" "}
          (blue-team detection playbooks), and{" "}
          <Link to="/products/kubernetes-zero-hero" className="text-primary underline">
            Kubernetes Zero to Hero
          </Link>
          {" "}(a full multi-node cluster lab). You can{" "}
          <Link to="/products" className="text-primary underline">
            browse the full catalog
          </Link>{" "}
          or filter by track.
        </p>

        <h2>Frequently asked questions</h2>
        <h3>What are hands-on tech courses?</h3>
        <p>
          Hands-on tech courses combine short video lessons with live,
          in-browser labs where you write real code, break things, and fix
          them. They replace watch-only tutorials with active practice, which
          is how skills actually stick.
        </p>
        <h3>Are live labs really better than video-only courses?</h3>
        <p>
          Yes. Applied practice consistently beats passive video watching on
          every retention benchmark. Live labs force you to type, debug and
          ship — the same loop you'll use on the job — so the skill transfers
          instead of fading after the course ends.
        </p>
        <h3>Which platform is best for career switchers?</h3>
        <p>
          For career switchers, look for a hybrid platform that offers
          project-based work, mentor access and lifetime updates. AviEdTech was
          built around this combination.
        </p>
      </section>

      <section className="rounded-2xl gradient-primary-bg text-primary-foreground p-8 md:p-10 text-center">
        <Award className="h-8 w-8 mx-auto mb-4 opacity-90" />
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
          Try the AviEdTech hybrid model
        </h2>
        <p className="opacity-90 max-w-xl mx-auto mb-6">
          Recorded lessons, live labs, mentor office hours, and lifetime access
          to every update — bundled into one price.
        </p>
        <Button asChild size="lg" variant="secondary">
          <Link to="/products">
            Browse courses & labs <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>
    </article>
  );
}
