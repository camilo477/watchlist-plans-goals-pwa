import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppIcon, { type AppIconName } from "../components/AppIcon";
import CoupleCats from "../components/CoupleCats";
import { RELATIONSHIP_START, timeTogether } from "../lib/relationship";
import "./HomePage.css";

const numberFormat = new Intl.NumberFormat("es-CO");

const chapters: {
  to: string;
  icon: AppIconName;
  title: string;
  detail: string;
  color: string;
}[] = [
  {
    to: "/watchlist",
    icon: "film",
    title: "Una peli juntos",
    detail: "",
    color: "peach",
  },
  {
    to: "/planes",
    icon: "plans",
    title: "Nuestra próxima cita",
    detail: "",
    color: "mint",
  },
  {
    to: "/metas",
    icon: "goals",
    title: "Sueños de los dos",
    detail: "",
    color: "yellow",
  },
  {
    to: "/ruleta",
    icon: "shuffle",
    title: "Que decida la suerte",
    detail: "",
    color: "pink",
  },
  {
    to: "/tamagotchi",
    icon: "cat",
    title: "Visitar a Zanahoria",
    detail: "",
    color: "mint",
  },
];

function TogetherCounter() {
  const [elapsed, setElapsed] = useState(() => timeTogether());

  useEffect(() => {
    const refresh = () => setElapsed(timeTogether());
    const interval = window.setInterval(refresh, 1000);
    // Mobile browsers suspend timers in the background. Read the actual clock
    // immediately on return, including back/forward cache restores.
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    refresh();

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const parts = [
    { value: elapsed.days, label: "días" },
    { value: elapsed.hours, label: "horas" },
    { value: elapsed.minutes, label: "minutos" },
    { value: elapsed.seconds, label: "segundos" },
  ];

  return (
    <section className="togetherCounter" aria-labelledby="counter-heading">
      <div className="counterMain">
        <h2 id="counter-heading">
          <span className="counterPulse" aria-hidden="true" /> Nuestro tiempo
          juntos
        </h2>
        <div
          className="counterTotal"
          role="timer"
          aria-live="off"
          aria-label={`${numberFormat.format(elapsed.totalSeconds)} segundos juntos`}
        >
          {numberFormat.format(elapsed.totalSeconds)}
        </div>
      </div>
      <div className="counterDetails">
        <dl
          className="counterParts"
          aria-label="Tiempo juntos en días, horas, minutos y segundos"
          aria-live="off"
        >
          {parts.map(({ value, label }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {label === "días"
                  ? numberFormat.format(value)
                  : String(value).padStart(2, "0")}
              </dd>
            </div>
          ))}
        </dl>
        <p className="counterSince">
          Desde el <time dateTime={RELATIONSHIP_START}>9 de enero de 2026</time>
        </p>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="togetherPage">
      <section className="togetherHero" aria-labelledby="together-heading">
        <div className="togetherIntro">
          <h1 id="together-heading">
            DianiMilo,
            <br />
            <em>la mejor pareja.</em>
          </h1>
          <div className="togetherSignature">
            <span /> Diana &amp; Camilo <span />
          </div>
        </div>
        <figure className="togetherPortrait">
          <span className="portraitTape" aria-hidden="true" />
          <CoupleCats />
          <span className="portraitHeart" aria-hidden="true">
            ♡
          </span>
        </figure>
      </section>

      <TogetherCounter />

      <section className="togetherChapters" aria-labelledby="chapters-heading">
        <div className="chaptersHeading">
          <span aria-hidden="true">♡</span>
        </div>
        <div className="chapterGrid">
          {chapters.map((chapter) => (
            <Link
              className={`chapterLink chapter-${chapter.color}`}
              key={chapter.to}
              to={chapter.to}
            >
              <span className="chapterIcon">
                <AppIcon name={chapter.icon} size={23} />
              </span>
              <span className="chapterCopy">
                <strong>{chapter.title}</strong>
                <span>{chapter.detail}</span>
              </span>
              <span className="chapterArrow">
                <AppIcon name="arrow" size={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
