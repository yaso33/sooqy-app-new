export const SPLASH_IMAGE = "/splash&wlc/splash.png";
export type IntroSlide = {
  image: string;
  title: string;
  text: string;
};

export const INTRO_SLIDES: IntroSlide[] = [
  {
    image: "/splash&wlc/wlc1.jpg",
    title: "اكتشف المتاجر من حولك",
    text: "اعثر على أقرب المتاجر في مدينتك واطّلع على منتجاتها مباشرة على الخريطة.",
  },
  {
    image: "/splash&wlc/wlc2.jpg",
    title: "تصفح المنتجات بسهولة",
    text: "قارن الأسعار بين المتاجر المجاورة واختر الأفضل لك بلمسة واحدة.",
  },
  {
    image: "/splash&wlc/wlc3.jpg",
    title: "تسوق من هاتفك",
    text: "اطلب، احجز، وتابع طلباتك حتى باب منزلك مباشرة من التطبيق.",
  },
];
