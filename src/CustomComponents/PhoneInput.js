import React, { useEffect, useState } from 'react';
import { CountryIso2, CountrySelector } from 'react-international-phone';
import 'react-international-phone/style.css';
import { getCountryFromDialCode } from '../Handlers/GeneralMethods.js';
import { useLocation } from 'react-router-dom';

const PhoneInput = (props) => {
  // states
    const [selectedCountry, setSelectedCountry] = useState('sa');
    const [mobileNumber, setMobileNumber] = useState('');
    const [countryKey, setCountryKey] = useState('966');
    const [lang , setLang] = useState()
    const location = useLocation()

    useEffect(()=>{
        setLang((new URLSearchParams(location.search)).get('lang'))
    },[location.search])

  // function to split the phone number
  function splitPhoneNumber(phoneNumber) {
    const match = phoneNumber.match(/^\+(\d+)[\s-]?(\d+)$/);
    if (match) {
      return {
        countryCode: match[1],
        phoneNumber: match[2],
      };
    }
    throw new Error('Invalid phone number format');
  }

  useEffect(() => {
    if (props.value) {
      try {
        let { countryCode, phoneNumber } = splitPhoneNumber(props.value);
        setCountryKey(countryCode);
        setMobileNumber(phoneNumber);
        if (countryKey !== countryCode)
          setSelectedCountry(getCountryFromDialCode(countryCode) ?? '1');
      } catch (error) {
        // Handle error if necessary
      }
    }
  }, []);

  // effects
  useEffect(() => {
    if (props.onChange && mobileNumber)
      props.onChange(props.name, '+' + countryKey + ' ' + mobileNumber);
  }, [mobileNumber]);

  useEffect(() => {
    if (props.onChange && mobileNumber)
      props.onChange(props.name, '+' + countryKey + ' ' + mobileNumber);
  }, [countryKey]);

  return (
<div
  className={`${props.className} p-0 m-0`}
  style={{ display: 'flex', ...props.style }}
>
  <div
    style={{ position: 'relative', display: 'flex', alignItems: 'center' , margin:'0'}}
  >
    <CountrySelector
      disabled={props.disabled}
      selectedCountry={selectedCountry}
      onSelect={(country) => {
        setSelectedCountry(country.iso2);
        setCountryKey(country.dialCode);
      }}
      style={{
        ...props.selectorStyle,
        display: 'inline-block',
        padding:'auto'
      }}
      className="no-dropdown-arrow"
    />
    {lang=='ar'?(
    <span
      style={{
        position: 'absolute',
        right:'33px',
        start: '33px',
        fontWeight: 'normal',
        fontSize: '14px',
        pointerEvents: 'none',
      }}
    >
      +{countryKey}
    </span>
    ):(
            <span
      style={{
        position: 'absolute',
        right:'33px',
        left: '33px',
        fontWeight: 'normal',
        fontSize: '14px',
        pointerEvents: 'none',
      }}
    >
      +{countryKey}
    </span>
    )}

  </div>

  <input
    name={props.name}
    inputMode="numeric"
    pattern="[0-9]*"
    lang="en"
    type='tele'
    disabled={props.disabled}
    className={`${props.inputClassName} h-100 px-3 w-100`}
    placeholder={props.placeholder}
    value={mobileNumber}
    onChange={(a) =>{
        setMobileNumber(
            a.target.value[0] === '0'
              ? a.target.value.replace('0', '').replace(/\D/g, '')
              : a.target.value.replace(/\D/g, '')
          )
    }

    }
    style={{
      position: 'relative',
      width: '100%',
      margin: '0px auto',
      border: 'none',
      outline: 'none',
      background: 'none',
      ...props.inputStyle,
    }}
    required={props.required}
  />
</div>
  );
};

export default PhoneInput;
