export const SPLASH_IMAGE = "/splash.png";
export type IntroSlide = {
  image: string;
  title: string;
  text: string;
};

export const INTRO_SLIDES: IntroSlide[] = [
  {
    image: "/wlc1.jpg",
    title: "اكتشف المتاجر من حولك",
    text: "اعثر على أقرب المتاجر في مدينتك واطّلع على منتجاتها مباشرة على الخريطة.",
  },
  {
    image: "/wlc2.jpg",
    title: "تصفح المنتجات بسهولة",
    text: "قارن الأسعار بين المتاجر المجاورة واختر الأفضل لك بلمسة واحدة.",
  },
  {
    image: "/wlc3.jpg",
    title: "تسوق من هاتفك",
    text: "اطلب، احجز، وتابع طلباتك حتى باب منزلك مباشرة من التطبيق.",
  },
];
