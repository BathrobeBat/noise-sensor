import { AddressIcon } from "../components/icons/AddressIcon";
import { LinkedInIcon } from "../components/icons/LinkedInIcon";
import { MailIcon } from "../components/icons/MailIcon";

export const Contact = () => {
  return (
    <>
      <div className="box-container">
        <section className="contact-container">
          <h2>Contact</h2>
          <h3>Find us at:</h3>
          <p>
            <AddressIcon />
            {"  "}Data Mining <br />
            Johannes Gutenberg University <br />
            Staudingerweg 9 <br />
            55128 Mainz, Germany{" "}
          </p>

          <p>
            <MailIcon /> hlane@uni-mainz.de
          </p>
          <p>
            <a
              className="linkedin-a"
              href="https://www.linkedin.com/company/nightingaleproject-johannesgutenberguniversitat.com/posts/?feedView=all"
            >
              <LinkedInIcon /> Our LinkedIn
            </a>
          </p>
        </section>
      </div>
    </>
  );
};
