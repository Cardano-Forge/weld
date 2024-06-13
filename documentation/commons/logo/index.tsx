import icon from "./icon.png";
import logoH from "./logo-h.png";
import logo from "./logo.png";

const imgSrc = {
  icon,
  logo,
  "logo-h": logoH,
};

const Logo = ({ type }: { type: "icon" | "logo" | "logo-h" }) => {
  return <img src={imgSrc[type]} alt="Logo" className="h-8" />;
};

export default Logo;
