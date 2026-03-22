import  {React , useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

const LanguageSwitcher = () => {
    const [langMenuIsOpen , setLangMenuIsOpen] = useState(false)
    const [lang , setLang] = useState("ar")
    const [loaded , setLoaded] = useState(false)

    const handleOpenMenu = ()=>{
        setLangMenuIsOpen(!langMenuIsOpen)
    }

    const { i18n } = useTranslation();

    const navigate = useNavigate();
    const location = useLocation();

    const getUrlParam = (paramName)=>{
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get(paramName)
    }

    const updateUrlParam = (paramName, paramValue) => {
        const searchParams = new URLSearchParams(location.search);

        if (paramValue) {
            searchParams.set(paramName, paramValue);
        } else {
            searchParams.delete(paramName);
        }

        navigate({
          pathname: location.pathname,
          search: searchParams.toString()
        }, { replace: true });
    };

    useEffect(()=>{
        const urlLang = getUrlParam('lang')
        if(urlLang){
            i18n.changeLanguage(urlLang);
            setLang(urlLang)
            document.documentElement.setAttribute('dir', urlLang === 'ar' ? 'rtl' : 'ltr');
            document.documentElement.setAttribute('lang', urlLang);
        }else{
            i18n.changeLanguage('ar');
            setLang('ar')
            document.documentElement.setAttribute('dir',  'rtl' );
            document.documentElement.setAttribute('lang', 'ar');
        }
    },[])

    useEffect(()=>{
      if(loaded){
        updateUrlParam('lang',lang)
        i18n.changeLanguage(lang);
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', lang);
      }else setLoaded(true)

    },[lang])

  return (
    <div className="header-btn">
        <div className='header-btn-tab' onClick={handleOpenMenu}>
            <img src={`/assets/images/${i18n.language=='ar'?'saudiarabia.png':'englandflag.png'}`} alt="Flag of Saudi Arabia" />
            <span > {i18n.language == 'ar' ? 'العربية' : 'English'}</span>
            <button aria-label="تغيير اللغة">
                <i className="fas fa-chevron-down" style={{ fontSize: '24px', color: '#073491' }}></i>
            </button>
        </div>
        <div className={`menu ${langMenuIsOpen?'open-menu':''}`}>
            <div className='menu-body'>
                <div className={`menu-item ${lang=="ar"?'selected':''}`} onClick={()=>{setLang("ar");setLangMenuIsOpen()}}>
                    <img src="/assets/images/saudiarabia.png" style={{ width:'23px' , height:'18px' }}  alt="Flag of Saudi Arabia" />
                    <span className='px-1'>العربية</span>
                </div>
                <div className={`menu-item ${lang=="en"?'selected':''}`} onClick={()=>{setLang("en");setLangMenuIsOpen()}}>
                    <img src="/assets/images/englandflag.png" style={{ width:'23px' , height:'18px' }} alt="Flag of England" />
                    <span className='px-1'>English</span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default LanguageSwitcher;
