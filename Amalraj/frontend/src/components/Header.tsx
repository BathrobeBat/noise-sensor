import { Link, NavLink } from "react-router-dom";

export const Header = () => {
  return (
    <>
      <header>
        <div className="header1">
          <Link to="https://nightingaleheart.com">
            {" "}
            <img
              className="header-logo"
              src="/nightingalelogo.png"
              alt="nightingale logo"
            />
          </Link>
        </div>

        <div className="header2">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact us</NavLink>
        </div>
      </header>
    </>
  );
};
