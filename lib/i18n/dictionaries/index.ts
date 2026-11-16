/**
 * TatildeBugün / AllTripX - Dictionaries Registry
 */

import { Locale } from "../types";
import { tr, Dictionary } from "./tr";
import { en } from "./en";

export const dictionaries: Record<Locale, Dictionary> = {
  tr,
  en,
};

export const getDictionary = (locale: Locale = "tr"): Dictionary => {
  return dictionaries[locale] || dictionaries.tr;
};
