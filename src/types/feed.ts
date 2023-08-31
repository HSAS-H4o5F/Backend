export type FeedOrigin =
  | "xwlb"
  | "cctvNews"
  | "cctvChina"
  | "cctvWorld"
  | "cctvSociety"
  | "cctvLaw"
  | "cctvTech"
  | "cctvLife"
  | "cctvEdu"
  | "qxyj"
  | "yicai"
  | "zhihu";

export const feedOrigins: Record<FeedOrigin, FeedOriginInfo> = {
  xwlb: {
    name: "新闻联播",
    url: "https://rsshub.app/cctv/xwlb",
  },
  cctvNews: {
    name: "央视新闻-新闻专题",
    url: "https://rsshub.app/cctv/news",
  },
  cctvChina: {
    name: "央视新闻-国内专题",
    url: "https://rsshub.app/cctv/china",
  },
  cctvWorld: {
    name: "央视新闻-国际专题",
    url: "https://rsshub.app/cctv/world",
  },
  cctvSociety: {
    name: "央视新闻-社会专题",
    url: "https://rsshub.app/cctv/society",
  },
  cctvLaw: {
    name: "央视新闻-法治专题",
    url: "https://rsshub.app/cctv/law",
  },
  cctvTech: {
    name: "央视新闻-科技专题",
    url: "https://rsshub.app/cctv/tech",
  },
  cctvLife: {
    name: "央视新闻-生活专题",
    url: "https://rsshub.app/cctv/life",
  },
  cctvEdu: {
    name: "央视新闻-教育专题",
    url: "https://rsshub.app/cctv/edu",
  },
  qxyj: {
    name: "国家突发事件预警信息发布网-当前生效预警",
    url: "https://rsshub.app/12379",
  },
  yicai: {
    name: "第一财经",
    url: "https://rsshub.app/yicai/latest",
  },
  zhihu: {
    name: "知乎日报",
    url: "https://www.zhihu.com/rss",
  },
};

export type FeedParser = (raw: string) => (Omit<FeedItem, "origin"> & Partial<FeedItem>)[];

interface FeedOriginInfo {
  name: string;
  url: string;
  parser?: FeedParser;
}

export interface Feed {
  version: 1;
  items: FeedItem[];
  error?: {
    origin: FeedOrigin;
    message: string;
  }[];
}

interface FeedItem {
  title: string;
  summary: string;
  author?: string;
  img?: string;
  link: string;
  /**
   * UTC 时间戳
   */
  published: number;
  origin: FeedOrigin;
}
