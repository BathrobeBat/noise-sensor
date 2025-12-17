import './About.css';

export const About = () => {
  return (
    <>
      <div className="about-box-container">
        <section className="about-container">
          <h2 className="about-title">About the Project</h2>

          <p className="about-paragraph">
            <b>Noise pollution is more than just an annoyance : it's a growing public health concern. </b>
            Chronic exposure to high noise levels, especially from road traffic, railways, and aircraft,
            has been linked to increased risks of <b>hypertension, stroke, heart failure, and coronary artery disease</b>.
            Research shows that noise exposure activates the body's stress response, increasing levels of
            stress hormones like cortisol and adrenaline. Over time, these effects can damage blood vessels,
            promote inflammation, and raise blood pressure, all of which contribute to cardiovascular disease.
          </p>

          <p className="about-paragraph">
            According to the <b>World Health Organization (WHO)</b>, prolonged exposure above
            <b> 53 dB from road traffic</b> and <b>45 dB from aircraft noise</b> can significantly
            impact health and sleep quality. Keeping average noise levels below these thresholds helps
            protect the heart and improve overall well-being.
          </p>

          <p className="about-paragraph">
            <b>Our mission:</b> to make environmental health data—like noise pollution—accessible to everyone,
            empowering individuals and communities to take preventive action for a healthier, quieter future.
          </p>

          <h3 className="about-subtitle">Sources</h3>
          <ul className="about-sources-list">
            <li>
              World Health Organization. <i>Environmental Noise Guidelines for the European Region</i>, 2018.{" "}
              <a
                href="https://www.who.int/europe/publications/i/item/9789289053563"
                target="_blank"
                rel="noopener noreferrer"
                className="about-links"
              >
                Read the report
              </a>
            </li>
            <li>
              Münzel, T. et al. <i>Noise Pollution and Cardiovascular Health</i>. <b>Circulation Research</b> (2024).{" "}
              <a
                href="https://www.ahajournals.org/doi/10.1161/CIRCRESAHA.123.323584"
                target="_blank"
                rel="noopener noreferrer"
                className="about-links"
              >
                Read the study
              </a>
            </li>
            <li>
              Tabaei, S. et al. <i>Noise Pollution and Cardiovascular Outcomes: An Umbrella Review</i>.{" "}
              <b>BMC Cardiovascular Disorders</b> (2025).{" "}
              <a
                href="https://bmccardiovascdisord.biomedcentral.com/articles/10.1186/s12872-025-04864-9"
                target="_blank"
                rel="noopener noreferrer"
                className="about-links"
              >
                Read the study
              </a>
            </li>
          </ul>

          <p className="about-footer">
            This website is part of the <b>Nightingale Project</b>, an initiative advancing research
            in heart disease through AI. Want to learn more about our work? Visit the&nbsp;
            <a
              className="about-links"
              target="_blank"
              rel="noopener noreferrer"
              href="https://nightingaleheart.de/"
            >
              Nightingale Project's
            </a>
            &nbsp;homepage.
          </p>
        </section>
      </div>
    </>
  );
};