import { getCountries, getCountryCallingCode } from "libphonenumber-js";


export function getCountryFromDialCode(dialCode) {
    if(dialCode.length ==1)dialCode = dialCode+'0'
    const countries = getCountries();
    dialCode = '+'+dialCode;
    for (let country of countries) {
      if (`+${getCountryCallingCode(country)}` === dialCode) {
        return country.toLowerCase();
      }
    }
    return null;
  }
