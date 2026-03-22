import {React , useState , useEffect} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import LanguageSwitcher from '../CustomComponents/LanguageSwitcher';

const Header = ()=> {
    const [showHeader, setShowHeader] = useState(true);
    const [showViewer, setShowViewer] = useState(false);
    const [nationalId, setNationalId] = useState('');
    const [code, setCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleScroll = () => {
        if (window.scrollY > 50) {
            setShowHeader(false);
        } else {
            setShowHeader(true);
        }
    };

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const sendOtp = async ()=>{
        setErrorMsg('');
        if(!nationalId){
            setErrorMsg('الرجاء إدخال الهوية الوطنية');
            return;
        }
        try{
            setLoading(true);
            const resp = await axios.post(`${API_BASE_URL}/portallogistice/send-otp`, { national_id: nationalId }, { headers: { 'Content-Type': 'application/json', 'X-LANG': 'ar' }});
            setOtpSent(true);
        }catch(e){
            setErrorMsg('تعذر إرسال رمز التحقق');
        }finally{
            setLoading(false);
        }
    };

    const verifyOtp = async ()=>{
        setErrorMsg('');
        if(!nationalId || !code){
            setErrorMsg('الرجاء إدخال الهوية والرمز');
            return;
        }
        try{
            setLoading(true);
            const resp = await axios.post(`${API_BASE_URL}/portallogistice/verify-otp`, { national_id: nationalId, otp: code }, { headers: { 'Content-Type': 'application/json', 'X-LANG': 'ar' }});
            const list = resp?.data?.data?.contracts || [];
            setContracts(list);
        }catch(e){
            setErrorMsg('رمز التحقق غير صحيح أو منتهي');
        }finally{
            setLoading(false);
        }
    };

    return (
        <>
        <header className={`header ${showHeader ? 'visible' : 'hidden'}`} style={{ maxHeight:'80px' }}>
            <div className="logo"  onClick={()=>window.open("/","_self")}>
                <img src="/assets/images/logo.png" alt="logo" style={{maxWidth:'78px' , maxHeight:'78px'}} />
            </div>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
                <button
                    onClick={()=>window.open('/', '_self')}
                    className="btn btn-sm"
                    style={{
                        background:'#073491', color:'#fff', border:'none', borderRadius:8, padding:'8px 12px', fontWeight:600
                    }}
                >
                    {document?.documentElement?.dir === 'rtl' ? 'التوقيع' : 'Sign'}
                </button>
                <button
                    onClick={()=>setShowViewer(true)}
                    className="btn btn-sm"
                    style={{
                        background:'#fff', color:'#073491', border:'1px solid #073491', borderRadius:8, padding:'8px 12px', fontWeight:600
                    }}
                >
                    {document?.documentElement?.dir === 'rtl' ? 'عرض العقود' : 'View Contracts'}
                </button>
                <LanguageSwitcher/>
            </div>
        </header>
        {showViewer && (
            <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center', padding:16}}>
                <div style={{background:'#fff', borderRadius:12, width:'min(520px, 95vw)', padding:'20px 16px', boxShadow:'0 10px 30px rgba(0,0,0,0.35)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                        <h3 style={{margin:0, color:'#073491'}}>{document?.documentElement?.dir === 'rtl' ? 'عرض العقود' : 'View Contracts'}</h3>
                        <button className="btn btn-sm" onClick={()=>setShowViewer(false)} style={{border:'none', background:'transparent', fontSize:22, lineHeight:1, color:'#999'}}>&times;</button>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', gap:12}}>
                        <div>
                            <label style={{display:'block', marginBottom:6}}>{document?.documentElement?.dir === 'rtl' ? 'الهوية الوطنية' : 'National ID'}</label>
                            <input value={nationalId} onChange={(e)=>setNationalId(e.target.value)} className="input-field" style={{width:'100%'}} placeholder={document?.documentElement?.dir === 'rtl' ? 'أدخل الهوية الوطنية' : 'Enter National ID'} />
                        </div>
                        {otpSent && (
                          <div>
                            <label style={{display:'block', marginBottom:6}}>{document?.documentElement?.dir === 'rtl' ? 'رمز التحقق (OTP)' : 'OTP Code'}</label>
                            <input value={code} onChange={(e)=>setCode(e.target.value)} className="input-field" style={{width:'100%'}} placeholder={document?.documentElement?.dir === 'rtl' ? 'أدخل رمز التحقق' : 'Enter OTP'} />
                          </div>
                        )}
                        {contracts?.length > 0 && (
                          <div style={{maxHeight: 260, overflow:'auto', borderTop:'1px solid #eef1f6', paddingTop:12}}>
                            {contracts.map((c)=> (
                              <div key={c.tracking_id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f3f7'}}>
                                <div>
                                  <div style={{fontWeight:700, color:'#073491'}}>{c.contract_type_ar || c.contract_type}</div>
                                  <div style={{fontSize:12, color:'#7A8499'}}>{c.status_ar || c.status} • {c.application_date}</div>
                                </div>
                                {c.contract_download_url && (
                                  <a href={c.contract_download_url} target="_blank" rel="noreferrer" className="btn btn-outline-success" style={{padding:'6px 10px'}}>{document?.documentElement?.dir === 'rtl' ? 'تحميل' : 'Download'}</a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {errorMsg && <div style={{color:'#d32f2f', fontSize:13}}>{errorMsg}</div>}
                        <div style={{display:'flex', gap:8, justifyContent:'space-between', marginTop:8}}>
                            <button className="btn btn-outline-secondary" onClick={()=>{ setShowViewer(false); setOtpSent(false); setContracts([]); setCode(''); }}>{document?.documentElement?.dir === 'rtl' ? 'إغلاق' : 'Close'}</button>
                            {!otpSent ? (
                              <button className="btn btn-submit" disabled={loading} onClick={sendOtp} style={{minWidth:140}}>{loading ? (document?.documentElement?.dir === 'rtl' ? 'جارٍ الإرسال...' : 'Sending...') : (document?.documentElement?.dir === 'rtl' ? 'إرسال الرمز' : 'Send OTP')}</button>
                            ) : (
                              <button className="btn btn-submit" disabled={loading} onClick={verifyOtp} style={{minWidth:140}}>{loading ? (document?.documentElement?.dir === 'rtl' ? 'جارٍ التحقق...' : 'Verifying...') : (document?.documentElement?.dir === 'rtl' ? 'تحقق' : 'Verify')}</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}

export default Header;
