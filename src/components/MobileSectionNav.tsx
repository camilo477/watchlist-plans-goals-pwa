import "./MobileSectionNav.css";

type SectionLink = {
  id: string;
  label: string;
  count: number;
};

export default function MobileSectionNav({
  label,
  sections,
}: {
  label: string;
  sections: SectionLink[];
}) {
  function goToSection(id: string) {
    const section = document.getElementById(id);
    if (!section) return;

    section.focus({ preventScroll: true });
    section.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }

  return (
    <nav className="mobileSectionNav" aria-label={label}>
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          aria-controls={section.id}
          onClick={() => goToSection(section.id)}
        >
          <span>{section.label}</span>
          <span className="mobileSectionCount">{section.count}</span>
        </button>
      ))}
    </nav>
  );
}
