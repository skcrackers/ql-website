import React, { useState, useEffect } from 'react';
import { Menu, X, Calendar, Users, BookOpen, ExternalLink, Mail, Instagram, Linkedin, ChevronRight, Phone, MapPin, Star, Award, UserCheck, Edit3, Plus, Trash2, Save, Lock, Camera, Upload } from 'lucide-react';
import { supabase } from './supabase';

// 멤버 데이터 (이전과 동일)
const LEADERSHIP = [
  { name: "이재형", role: "대표", company: "Maxxij", phone: "010-9380-8877", email: "maxxi.eeee@gmail.com", location: "서울 강남", profile_link: "@maxxij_ldn, @maxxij_official", mbti: "ENTP 변론가", interests: "AI 창작, 진화성장, 개방적사고, 딥워크 루틴", bio: "maxxij", shared_link: "", image: "/images/이재형.jpeg", group: "대표단" },
  { name: "김태훈", role: "선임 외국변호사", company: "법무법인 세이지", phone: "010-5486-1446", email: "taehoon.ted.kim@gmail.com", location: "서울", profile_link: "http://www.sagelaw.co.kr/attorneys/view?code=thkim", mbti: "ENFJ 선도자", interests: "AI산업, 공연 유통", bio: "김태훈 선임 외국변호사는 법무법인 세이지 기업자문/M&A Practice Group의 부팀장으로서, 외국 기업을 대상으로 한 자문 및 인수·합병(M&A) 거래를 전문적으로 수행하고 있습니다.", shared_link: "http://www.sagelaw.co.kr/attorneys/view?code=thkim", image: "/images/김태훈.jpg", group: "대표단" },
  { name: "조규현", role: "변호사", company: "법률사무소 온유", phone: "010-2057-8170", email: "chopd_taiji@naver.com", location: "서울", profile_link: "@kyu_kyuhyun_cho", mbti: "ENTJ 통솔자", interests: "Ai리걸테크, 창업아이디어, 엔젤투자", bio: "저는 서초동에서 변호사사무실을 운영하는 조규현 회원입니다. 형사소송과 부동산관련 소송을 전문으로 하고 있지만, 계약서 작성 등 통상적인 변호사업무 전반을 수행하고 있습니다.", shared_link: "", image: "/images/조규현.jpg", group: "대표단" }
];

const STAFF = [
  { name: "성용훈", role: "대표", company: "(주)재원엠앤티", phone: "010-8882-6515", email: "syh6515@gmail.com", location: "서울", profile_link: "", mbti: "", interests: "트렌드, AI, 창작", bio: "의류패션산업에 종사하고 있는 성용훈 입니다.", shared_link: "https://www.fila.co.kr/brand/tennis/view.asp?num=1599", image: "/images/성용훈.jpeg", group: "운영진" },
  { name: "정다희", role: "대표이사", company: "크레디아", phone: "010-8742-4020", email: "dahee@credia.co.kr", location: "서울", profile_link: "http://www.credia.co.kr", mbti: "", interests: "공연 유통, 컨텐츠 유통, 공간 임대 수익모델", bio: "학력\n중앙대학교 예술경영과 석사\n서울예술대학교 사진과 학사\n\n경력\n현) CREDIA 대표\n전) CIELOS & CLUB BALCONY 매니저\n전) S SHINSEGAE STYLE 에디터", shared_link: "", image: "/images/정다희.jpeg", group: "운영진" },
  { name: "서성권", role: "대표", company: "주식회사 클링커즈", phone: "010-9430-3795", email: "skcrackers@gmail.com", location: "서울", profile_link: "https://www.instagram.com/skcrackers/", mbti: "ESTJ 경영가", interests: "AI, 투자, 글로벌 진출", bio: "안녕하세요. 클링커즈를 운영하고 있는 서성권입니다. 현재는 국내에 거주하는 외국인근로자를 위한 금융플랫폼을 만들고 있습니다. 개인투자도 함께 진행하고 있습니다. IT, 특히 핀테크 관련분야나, 금융기관 연결등 기여할 수 있는 부분이 있습니다.", shared_link: "https://app.glo-w.io/", image: "/images/서성권.png", group: "운영진" }
];

const MEMBERS = [
  { name: "김미영", role: "창작자", company: "작가(프리랜서)", phone: "010-8698-9818", email: "gimmeeyoung@gmail.com", location: "부산, 서울", profile_link: "www.meeyoungkimstudio.com / @meeyoungkimstudio", mbti: "", interests: "해외진출, 성공적인 전시 개최, 네트워킹", bio: "안녕하세요. 작가로 활동하고 있는 김미영입니다. 이화여자대학교에서 동양화 전공으로 학부와 석사를 졸업했습니다. 이후 영국 런던으로 유학을 떠나 Royal College of Art 에서 Painting을 전공했고 2014년에 귀국하여 현재까지 작가로 활발하게 활동하고 있습니다.", shared_link: "www.meeyoungkimstudio.com / @meeyoungkimstudio", image: "/images/김미영.jpg", group: "회원" },
  { name: "김은주", role: "대표", company: "애드어스 / 김은주", phone: "010-9029-9893", email: "ej.kim@adus.page", location: "서울, 경기", profile_link: "www.adus.co.kr", mbti: "", interests: "로컬 문화, 패션, 자산증식", bio: "6년 차 광고대행사 '애드어스'를 운영하는 김은주입니다. 감사하게도 첫 광고주분들과 6년째 인연을 이어오며 80% 이상의 재계약률이라는 신뢰를 얻고 있습니다.", shared_link: "", image: "/images/김은주.jpeg", group: "회원" },
  { name: "김소정", role: "서비스기획/대표", company: "녹트리서치", phone: "010-5259-9587", email: "emma@noct-research.com", location: "서울", profile_link: "https://instagram.com/sojung_wellness", mbti: "ISTP 장인", interests: "웰니스, AI, 유통", bio: "수면건강 스타트업 녹트리서치를 운영하고 있어요.", shared_link: "https://noct-research.com", image: "/images/김소정.png", group: "회원" },
  { name: "박진기", role: "대표", company: "(주)엠엠엠디", phone: "010-8299-0206", email: "jinpark@mmmd.kr", location: "서울", profile_link: "", mbti: "ESTJ 경영가", interests: "Ip, ai, 글로벌", bio: "도로시와 라는 여성 속옷 브랜드 운영 및 다양한 커머스 브랜드 런칭 및 운영예정.", shared_link: "", image: "/images/박진기.jpeg", group: "회원" },
  { name: "박희정", role: "대표약사 / 대표", company: "센느약국", phone: "010-9620-1750", email: "buingng@gmail.com", location: "서울 강남", profile_link: "heejung_parkk / instagram", mbti: "ESTJ 경영가", interests: "마케팅. 유통 수익모델. 브랜딩", bio: "센느약국 대표약사. 대학병원 원내약국, 제약회사 마케팅과 사업개발, MBA 경험을 토대로 강남에서 다이어트 전문약국 운영중.", shared_link: "", image: "/images/박희정.jpeg", group: "회원" },
  { name: "백세린", role: "연주자", company: "서울챔버오케스트라", phone: "010-8626-3527", email: "dami3527@gmail.com", location: "서울", profile_link: "", mbti: "ESFP 연예인", interests: "투자", bio: "세계적인 바이올리니스트 Maxim Vengerov로부터 \"Wonderful playing\"이라는 극찬을 받은 바이올리니스트. 예원학교와 서울예술고등학교를 거쳐 연세대학교 음악대학에서 악장 역임 및 최우등상을 수상하며 수석으로 졸업.", shared_link: "", image: "/images/백세린.jpeg", group: "회원" },
  { name: "손승현", role: "대표 원장", company: "괜찮아 정신건강의학과 의원", phone: "010-5712-0919", email: "narannamja@gmail.com", location: "서울", profile_link: "https://www.instagram.com/kinghong8888", mbti: "INTP 논리술사", interests: "신간 출판, 여유시간 확보, 체중 감량", bio: "안녕하세요 괜찮아 정신건강의학과 의원의 손승현입니다. 세부전공은 소아 청소년 정신의학입니다.", shared_link: "https://okmind.co.kr/", image: "/images/손승현.jpg", group: "회원" },
  { name: "양준철", role: "대표", company: "(주)온오프믹스", phone: "010-3048-5578", email: "promise4u@gmail.com", location: "서울", profile_link: "https://linkedin.com/in/promise4u , https://instagram.com/promise4u", mbti: "ENTP 변론가", interests: "M&A, 투자", bio: "엔지니어 출신 창업가로 2001년 부터 벤처 창업 길에 올라서 스타트업 활성화를 위한 다양한 활동을 해왔습니다. MICE 시장의 디지털 전환을 목표로 ONOFFMIX.COM 이라는 이벤트 테크 플랫폼을 만들어 운영해 왔습니다.", shared_link: "", image: "/images/양준철.jpg", group: "회원" },
  { name: "이수지", role: "기획자, 디자이너", company: "뉴럴아케이드/이수지", phone: "010-9123-5600", email: "2sudie@gmail.com", location: "서울", profile_link: "", mbti: "ENFP 활동가", interests: "AI, 숏폼, 미국", bio: "IT 스타트업에서 기획자 출신 창업자로 10+년. 두번 M&A 됨. 26년에 세번째 회사를 설립해서 AI 챗봇 기반 앱 팩토리 테크 영역에서 매년 4~12개의 앱을 런칭해나갈 예정입니다.", shared_link: "https://www.neuralarcade.ai/", image: "/images/이수지.jpg", group: "회원" },
  { name: "이연지", role: "연주자", company: "피아니스트 이연지", phone: "010-9187-9507", email: "leeyunji95@gmail.com", location: "서울, 인천", profile_link: "instagram.com/artsofyonji", mbti: "ESTP 사업가", interests: "브랜딩", bio: "안녕하세요, 저는 피아니스트 이연지입니다. 연주자이자 교육자로 활동하고 있으며, 작년에는 제 이름 고울 연 자를 딴 고울클래식이라는 대회개최업체의 대표로 콩쿠르를 개최하고 운영하였습니다.", shared_link: "", image: "/images/이연지.jpeg", group: "회원" },
  { name: "홍석희", role: "대표", company: "인플루러닝", phone: "010-3151-8821", email: "kowell21@gmail.com", location: "서울, 경기", profile_link: "", mbti: "ENFJ 선도자", interests: "ai, 콘텐트, 글로벌", bio: "인플루언서를 기반으로 영어 교육 사업을 하고 있습니다.", shared_link: "", image: "/images/홍석희.png", group: "회원" },
  { name: "장우진", role: "변호사", company: "법무법인 세종", phone: "010-8012-1104", email: "dc.woojin@gmail.com", location: "서울", profile_link: "", mbti: "", interests: "AI창작, 창작자 수익모델, 전직(轉職)", bio: "2020-현재 법무법인(유) 세종\n2017-2020 뉴욕시 브루클린 검찰청 공판1부 검사\n2016-2017 뉴욕주 검찰청 금융범죄부 검사", shared_link: "", image: "/images/장우진.jpg", group: "회원" },
  { name: "장유진", role: "변호사", company: "법무법인서연", phone: "010-2951-7780", email: "eueu1001@naver.com", location: "서울(홍대, 합정 선호)", profile_link: "lawyerzzang.official 인스타그램", mbti: "ENFP 활동가", interests: "개인 브랜딩, 웹툰 안정화, 유튜브제작 등", bio: "안녕하세요 열혈벼노사 짱변입니다. :)", shared_link: "", image: "/images/장유진.jpg", group: "회원" },
  { name: "정다빈", role: "창업자/대표이사", company: "밤부네트워크", phone: "010-9754-7711", email: "chung@bamboonetwork.co.kr", location: "서울", profile_link: "https://bamboonetwork.co.kr/", mbti: "ENFP 활동가", interests: "ai, 크리에이터이코너미, 숏폼", bio: "Beyond production, I specialize in building scalable IP pipelines, integrating branded content strategies, and forging global partnerships across Asia, the U.S., and beyond.", shared_link: "https://www.linkedin.com/in/dabin-chung-717403174/", image: "/images/정다빈.jpg", group: "회원" },
  { name: "홍성혁", role: "PEF운용 본부장 / 상무", company: "트루벤인베스트먼트", phone: "010-6701-7711", email: "alex.hong@trubeninvestment.com", location: "서울", profile_link: "https://www.instagram.com/alexikakos_sunghyeok_hong", mbti: "INTP 논리술사", interests: "예술 / 운동 / 공부", bio: "놀기 좋아하는 금융공학/이론물리학자. 낮에는 여의도에서 사모펀드 운용하고 밤에는 노래를 부르거나 피아노를 칩니다.", shared_link: "", image: "/images/홍성혁.jpg", group: "회원" },
  { name: "황도영", role: "대표", company: "글로드", phone: "010-6324-5161", email: "hdoyoo@naver.com", location: "서울/경기", profile_link: "", mbti: "", interests: "마케팅, AI공부, 신사업", bio: "연세대학교 체육교육학과를 졸업하고 전략마케팅 학회 MARP에서 활동하며 창업을 꿈꿔왔습니다. 현재는 다이닝 바 글로드를 창업한 지 4년 차 이며 작년 말엔 인사동에 월하동이란 돼지곰탕 집을 오픈했습니다.", shared_link: "", image: "/images/황도영.jpg", group: "회원" }
];

const QLWebsite = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  
  // 로그인 관련 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  
  // 편집 모드 관련 상태
  const [editMode, setEditMode] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    description: '',
    imageFiles: []
  });
  const [dragActive, setDragActive] = useState(false);
  const [selectedEventGallery, setSelectedEventGallery] = useState(null);

  const ADMIN_PASSWORD = 'ql2026';
  const MAX_IMAGES = 100;

  // 로그인 처리
  const handleLogin = () => {
    if (loginPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginPassword('');
      sessionStorage.setItem('ql-auth', 'true');
    } else {
      alert('비밀번호가 틀렸습니다.');
      setLoginPassword('');
    }
  };

  // 🔥 Supabase에서 이벤트 불러오기
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (eventsError) throw eventsError;

      const eventsWithImages = await Promise.all(
        eventsData.map(async (event) => {
          const { data: imagesData, error: imagesError } = await supabase
            .from('event_images')
            .select('image_url, order_index')
            .eq('event_id', event.id)
            .order('order_index', { ascending: true });

          if (imagesError) {
            console.error('Error fetching images:', imagesError);
            return { ...event, images: [] };
          }

          return {
            ...event,
            images: imagesData.map(img => img.image_url)
          };
        })
      );

      setEvents(eventsWithImages);
    } catch (error) {
      console.error('Error fetching events:', error);
      alert('이벤트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    
    // 인증 상태 확인
    const isAuth = sessionStorage.getItem('ql-auth');
    if (isAuth === 'true') {
      setIsAuthenticated(true);
    }
    
    // Supabase에서 이벤트 불러오기
    fetchEvents();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 🔥 이미지 업로드 (Supabase Storage)
  const uploadImages = async (files, eventId) => {
    const uploadedUrls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}/${Date.now()}_${i}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleImageFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleImageFiles = (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const remainingSlots = MAX_IMAGES - eventForm.imageFiles.length;
    const filesToAdd = imageFiles.slice(0, remainingSlots);
    
    if (filesToAdd.length === 0) {
      alert(`최대 ${MAX_IMAGES}장까지만 업로드할 수 있습니다.`);
      return;
    }

    // File 객체 그대로 저장 (base64 변환 없음)
    setEventForm({
      ...eventForm,
      imageFiles: [...eventForm.imageFiles, ...filesToAdd]
    });
  };

  const removeImageFile = (index) => {
    const newFiles = eventForm.imageFiles.filter((_, i) => i !== index);
    setEventForm({ ...eventForm, imageFiles: newFiles });
  };

  const openEventForm = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        title: event.title,
        date: event.date,
        description: event.description || '',
        imageFiles: [] // 기존 이미지는 URL로 표시, 새 이미지만 추가
      });
    } else {
      setEditingEvent(null);
      setEventForm({ title: '', date: '', description: '', imageFiles: [] });
    }
    setShowEventForm(true);
  };

  const saveEvent = async () => {
    if (!eventForm.title || !eventForm.date) {
      alert('제목과 날짜는 필수입니다.');
      return;
    }

    setUploading(true);

    try {
      if (editingEvent) {
        // 수정
        const { error: updateError } = await supabase
          .from('events')
          .update({
            title: eventForm.title,
            date: eventForm.date,
            description: eventForm.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEvent.id);

        if (updateError) throw updateError;

        // 새 이미지 업로드
        if (eventForm.imageFiles.length > 0) {
          const imageUrls = await uploadImages(eventForm.imageFiles, editingEvent.id);
          
          const { data: existingImages } = await supabase
            .from('event_images')
            .select('order_index')
            .eq('event_id', editingEvent.id)
            .order('order_index', { ascending: false })
            .limit(1);

          const startIndex = existingImages && existingImages.length > 0 ? existingImages[0].order_index + 1 : 0;

          const imageRecords = imageUrls.map((url, idx) => ({
            event_id: editingEvent.id,
            image_url: url,
            order_index: startIndex + idx
          }));

          const { error: imagesError } = await supabase
            .from('event_images')
            .insert(imageRecords);

          if (imagesError) throw imagesError;
        }

      } else {
        // 새로 추가
        const { data: newEvent, error: insertError } = await supabase
          .from('events')
          .insert([{
            title: eventForm.title,
            date: eventForm.date,
            description: eventForm.description
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        // 이미지 업로드
        if (eventForm.imageFiles.length > 0) {
          const imageUrls = await uploadImages(eventForm.imageFiles, newEvent.id);
          
          const imageRecords = imageUrls.map((url, idx) => ({
            event_id: newEvent.id,
            image_url: url,
            order_index: idx
          }));

          const { error: imagesError } = await supabase
            .from('event_images')
            .insert(imageRecords);

          if (imagesError) throw imagesError;
        }
      }

      await fetchEvents();
      setShowEventForm(false);
      setEditingEvent(null);
      setEventForm({ title: '', date: '', description: '', imageFiles: [] });
      alert('저장되었습니다!');

    } catch (error) {
      console.error('Save error:', error);
      alert('저장에 실패했습니다: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteEvent = async (event) => {
    if (!confirm('이 이벤트를 삭제하시겠습니까?')) return;

    try {
      // Storage에서 이미지 파일 삭제
      if (event.images && event.images.length > 0) {
        const filePaths = event.images.map(url => {
          const path = url.split('/event-images/')[1];
          return path;
        }).filter(Boolean);

        if (filePaths.length > 0) {
          await supabase.storage
            .from('event-images')
            .remove(filePaths);
        }
      }

      // DB에서 이벤트 삭제 (CASCADE로 event_images도 자동 삭제됨)
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      await fetchEvents();
      alert('삭제되었습니다!');

    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제에 실패했습니다: ' + error.message);
    }
  };

  const navigation = [
    { name: 'Home', id: 'home' },
    { name: 'Culture Code', id: 'culture' },
    { name: 'Members', id: 'members' },
    { name: 'Events', id: 'events' }
  ];

  const MemberCard = ({ member }) => (
    <div
      onClick={() => setSelectedMember(member)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group"
    >
      <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
        {member.image ? (
          <img 
            src={member.image} 
            alt={member.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-slate-400">
            {member.name[0]}
          </div>
        )}
        <div className="absolute top-3 right-3">
          {member.profile_link && (
            <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
              <ExternalLink className="w-5 h-5 text-amber-600" />
            </div>
          )}
        </div>
      </div>
      
      <div className="p-5">
        <h4 className="text-xl font-semibold text-slate-900 mb-1">{member.name}</h4>
        <p className="text-sm text-amber-700 mb-2 font-medium">{member.role}</p>
        <p className="text-sm text-slate-600 mb-3 line-clamp-1">{member.company}</p>
        
        {member.interests && (
          <div className="flex flex-wrap gap-2 mt-4">
            {member.interests.split(',').slice(0, 2).map((interest, i) => (
              <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">
                {interest.trim()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // 로그인 화면
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-3xl">Q</span>
            </div>
          </div>
          <h2 className="text-2xl font-light text-center mb-2">문화산업포럼 Q.L</h2>
          <p className="text-slate-600 text-center mb-6">회원 전용 페이지입니다</p>
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="비밀번호를 입력하세요"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
            autoFocus
          />
          <button
            onClick={handleLogin}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg transition-colors font-medium"
          >
            입장하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
      {/* 편집 모드 플로팅 버튼 */}
      <button
        onClick={() => setEditMode(!editMode)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl transition-all duration-300 ${
          editMode ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
        } text-white`}
      >
        {editMode ? <X className="w-6 h-6" /> : <Edit3 className="w-6 h-6" />}
      </button>

      {/* 비밀번호 프롬프트 */}

      {/* 이벤트 폼 모달 */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
            <div className="p-8 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-medium text-slate-900">
                  {editingEvent ? '이벤트 수정' : '새 이벤트 추가'}
                </h3>
                <button onClick={() => setShowEventForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">제목 *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="예: 2월 정기 모임"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">날짜 *</label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">설명</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="이벤트 설명"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  사진 ({eventForm.imageFiles.length}/{MAX_IMAGES})
                </label>
                
                {/* 드래그앤드롭 영역 */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4 ${
                    dragActive ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:border-amber-400'
                  }`}
                >
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">여러 사진을 드래그하거나 클릭하여 업로드</p>
                  <p className="text-sm text-slate-500 mb-4">최대 {MAX_IMAGES}장까지 (현재 {eventForm.imageFiles.length}장)</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && handleImageFiles(Array.from(e.target.files))}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer transition-colors"
                  >
                    파일 선택
                  </label>
                </div>

                {/* 이미지 미리보기 그리드 */}
                {eventForm.imageFiles.length > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {eventForm.imageFiles.map((file, idx) => (
                      <div key={idx} className="relative group aspect-square">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Preview ${idx + 1}`} 
                          className="w-full h-full object-cover rounded-lg" 
                        />
                        <button
                          onClick={() => removeImageFile(idx)}
                          className="absolute top-1 right-1 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
                          {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-slate-200 flex space-x-3">
              <button
                onClick={saveEvent}
                disabled={uploading}
                className={`flex-1 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium ${
                  uploading 
                    ? 'bg-slate-400 cursor-not-allowed text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                <Save className="w-5 h-5" />
                <span>{uploading ? '저장 중...' : '저장'}</span>
              </button>
              <button
                onClick={() => setShowEventForm(false)}
                disabled={uploading}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 갤러리 모달 */}
      {selectedEventGallery && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEventGallery(null)}>
          <div className="max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-light text-white">{selectedEventGallery.title}</h3>
              <button onClick={() => setSelectedEventGallery(null)} className="p-2 text-white hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[80vh] overflow-y-auto">
              {selectedEventGallery.images.map((image, idx) => (
                <img key={idx} src={image} alt={`${selectedEventGallery.title} ${idx + 1}`} className="w-full aspect-square object-cover rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-white/80 backdrop-blur-lg shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">Q</span>
              </div>
              <div>
                <h1 className="text-2xl font-light tracking-tight text-slate-900">문화산업포럼</h1>
                <p className="text-xs text-amber-700 tracking-widest">CULTURE INDUSTRY FORUM Q.L</p>
              </div>
            </div>
            
            <div className="hidden md:flex space-x-1">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`px-6 py-2 rounded-lg transition-all duration-300 ${
                    activeSection === item.id
                      ? 'bg-amber-100 text-amber-900 font-medium'
                      : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 shadow-lg">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileMenuOpen(false);
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`w-full text-left px-6 py-4 border-b border-slate-100 ${
                  activeSection === item.id ? 'bg-amber-50 text-amber-900' : 'text-slate-600'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-8 mb-16">
            <div className="inline-block">
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-600"></div>
                <span className="text-sm tracking-[0.3em] text-amber-700 uppercase">Est. 2026</span>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-600"></div>
              </div>
            </div>
            
            <h2 className="text-6xl md:text-7xl font-light text-slate-900 tracking-tight leading-tight">
              느슨하게 연결되고<br/>
              <span className="text-amber-700">함께 경험을 쌓는</span><br/>
              공동체
            </h2>
            
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto font-light leading-relaxed">
              문화·예술·콘텐츠·플랫폼·테크·정책 등<br/>
              문화산업 전반에 관심과 문제의식을 가진 사람들의 커뮤니티
            </p>

            <div className="flex flex-wrap gap-4 justify-center pt-8">
              <div className="bg-white rounded-2xl px-8 py-6 shadow-lg border border-slate-100">
                <div className="text-4xl font-light text-amber-700 mb-1">22+</div>
                <div className="text-sm text-slate-600 tracking-wide">Active Members</div>
              </div>
              <div className="bg-white rounded-2xl px-8 py-6 shadow-lg border border-slate-100">
                <div className="text-4xl font-light text-amber-700 mb-1">2x</div>
                <div className="text-sm text-slate-600 tracking-wide">Monthly Meetups</div>
              </div>
              <div className="bg-white rounded-2xl px-8 py-6 shadow-lg border border-slate-100">
                <div className="text-4xl font-light text-amber-700 mb-1">∞</div>
                <div className="text-sm text-slate-600 tracking-wide">Possibilities</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Culture Code Section */}
      <section id="culture" className="py-20 px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-light text-white mb-4">Culture Code</h3>
            <div className="h-1 w-24 bg-amber-500 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { icon: <Users className="w-8 h-8" />, title: "공감·연민·협력", desc: "서로를 이해하고 함께 성장합니다" },
              { icon: <BookOpen className="w-8 h-8" />, title: "환대·존중", desc: "처음 만난 사람에게도 먼저 인사하고 환대합니다" },
              { icon: <ChevronRight className="w-8 h-8" />, title: "바른 언어", desc: "서로에게 존중하는 커뮤니케이션을 사용합니다" }
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="text-amber-500 mb-4">{item.icon}</div>
                <h4 className="text-xl font-medium text-white mb-2">{item.title}</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-10 border border-white/20">
            <h4 className="text-2xl font-light text-white mb-6">운영 방침</h4>
            <div className="space-y-4 text-slate-200">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <p className="leading-relaxed">월 2회 내외 모임: 주제 있는 공식 모임(월 1회) + 자율 참여 교류 모임(월 1회 이상)</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <p className="leading-relaxed">모든 참여는 자율이며, 참석을 강제하거나 의무를 부과하지 않습니다</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <p className="leading-relaxed">참여할수록 더 많은 사람과 연결되고 깊은 경험을 얻는 구조를 지향합니다</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <p className="leading-relaxed">연회비제: 연간 회원 100만원 / 하반기 회원(7월 이후) 50만원</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Members Section */}
      <section id="members" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-light text-slate-900 mb-4">Our Members</h3>
            <p className="text-slate-600 text-lg">다양한 분야의 전문가들이 함께합니다</p>
            <div className="h-1 w-24 bg-amber-600 mx-auto mt-6"></div>
          </div>

          {/* 대표단 */}
          <div className="mb-16">
            <div className="flex items-center space-x-3 mb-8">
              <Star className="w-6 h-6 text-amber-600" />
              <h4 className="text-3xl font-light text-slate-900">대표단</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {LEADERSHIP.map((member, idx) => (
                <MemberCard key={idx} member={member} />
              ))}
            </div>
          </div>

          {/* 운영진 */}
          <div className="mb-16">
            <div className="flex items-center space-x-3 mb-8">
              <Award className="w-6 h-6 text-blue-600" />
              <h4 className="text-3xl font-light text-slate-900">운영진</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {STAFF.map((member, idx) => (
                <MemberCard key={idx} member={member} />
              ))}
            </div>
          </div>

          {/* 회원 */}
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <UserCheck className="w-6 h-6 text-emerald-600" />
              <h4 className="text-3xl font-light text-slate-900">회원</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {MEMBERS.map((member, idx) => (
                <MemberCard key={idx} member={member} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-20 px-4 bg-gradient-to-br from-amber-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-light text-slate-900 mb-4">Activities & Events</h3>
            <div className="h-1 w-24 bg-amber-600 mx-auto"></div>
          </div>

          {/* 편집 모드: 이벤트 추가 버튼 */}
          {editMode && (
            <div className="mb-8 flex justify-end">
              <button
                onClick={() => openEventForm()}
                className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-colors shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>이벤트 추가</span>
              </button>
            </div>
          )}

          {/* 로딩 상태 */}
          {loading ? (
            <div className="text-center py-20">
              <p className="text-slate-500">이벤트를 불러오는 중...</p>
            </div>
          ) : events.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {events.map((event) => (
                <div key={event.id} className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                  {event.images && event.images.length > 0 && (
                    <div 
                      className="aspect-video bg-slate-200 overflow-hidden cursor-pointer relative"
                      onClick={() => setSelectedEventGallery(event)}
                    >
                      <img src={event.images[0]} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      {event.images.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                          <Camera className="w-4 h-4" />
                          <span>{event.images.length}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-xl font-medium text-slate-900 mb-2">{event.title}</h4>
                        <p className="text-sm text-amber-700 flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {event.date}
                        </p>
                      </div>
                      {editMode && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openEventForm(event)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteEvent(event)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-slate-500">아직 이벤트가 없습니다.</p>
            </div>
          )}

          {/* 기존 정기 모임 정보 */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
              <Calendar className="w-10 h-10 text-amber-600 mb-4" />
              <h4 className="text-2xl font-medium text-slate-900 mb-4">정기 모임</h4>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start">
                  <span className="text-amber-600 mr-2">•</span>
                  주제 있는 라운드테이블 (월 1회)
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 mr-2">•</span>
                  자율 참여 교류 모임 (월 1회 이상)
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 mr-2">•</span>
                  전시·공연·상영 관람
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
              <Users className="w-10 h-10 text-amber-600 mb-4" />
              <h4 className="text-2xl font-medium text-slate-900 mb-4">특별 활동</h4>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start">
                  <span className="text-amber-600 mr-2">•</span>
                  게스트 초청 세션
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 mr-2">•</span>
                  소규모 실험 및 협업
                </li>
                <li className="flex items-start">
                  <span className="text-amber-600 mr-2">•</span>
                  아이디어 공유 및 파일럿 시도
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-10 text-white text-center">
            <h4 className="text-2xl font-light mb-4">참여를 원하시나요?</h4>
            <p className="text-slate-300 mb-6 leading-relaxed">
              문화산업에 관심이 있고 함께 성장하고 싶은 분들을 환영합니다
            </p>
            <button className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-full transition-all duration-300 font-medium shadow-lg hover:shadow-xl">
              참여 신청하기
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-6">
            <h3 className="text-2xl font-light mb-2">문화산업포럼 Q.L</h3>
            <p className="text-slate-400 text-sm">Culture Industry Forum Q.L</p>
          </div>
          <div className="flex justify-center space-x-6 mb-6">
            <Mail className="w-5 h-5 text-slate-400 hover:text-amber-500 cursor-pointer transition-colors" />
            <Instagram className="w-5 h-5 text-slate-400 hover:text-amber-500 cursor-pointer transition-colors" />
          </div>
          <p className="text-slate-500 text-sm">© 2026 문화산업포럼 Q.L. All rights reserved.</p>
        </div>
      </footer>

      {/* Member Detail Modal - 이전과 동일 */}
      {selectedMember && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-br from-slate-50 to-amber-50 p-8 border-b border-slate-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-6">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl bg-slate-200">
                    {selectedMember.image ? (
                      <img src={selectedMember.image} alt={selectedMember.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-400">
                        {selectedMember.name[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-3xl font-medium text-slate-900 mb-2">{selectedMember.name}</h3>
                    <p className="text-amber-700 text-lg font-medium mb-1">{selectedMember.role}</p>
                    <p className="text-slate-600">{selectedMember.company}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="flex flex-wrap gap-4 mt-6 text-sm">
                {selectedMember.email && (
                  <a 
                    href={`mailto:${selectedMember.email}`}
                    className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg hover:bg-amber-50 transition-colors group"
                  >
                    <Mail className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
                    <span className="text-slate-700 group-hover:text-amber-800">{selectedMember.email}</span>
                  </a>
                )}
                {selectedMember.phone && (
                  <a 
                    href={`tel:${selectedMember.phone}`}
                    className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg hover:bg-amber-50 transition-colors group"
                  >
                    <Phone className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
                    <span className="text-slate-700 group-hover:text-amber-800">{selectedMember.phone}</span>
                  </a>
                )}
                {selectedMember.location && (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{selectedMember.location}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8">
              {selectedMember.bio && (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                    <div className="w-1 h-5 bg-amber-600 rounded-full mr-3"></div>
                    소개
                  </h4>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-6 rounded-xl">
                    {selectedMember.bio}
                  </p>
                </div>
              )}

              {selectedMember.interests && (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                    <div className="w-1 h-5 bg-amber-600 rounded-full mr-3"></div>
                    2026 관심 분야
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.interests.split(',').map((interest, i) => (
                      <span key={i} className="px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 rounded-full text-sm font-medium">
                        {interest.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedMember.mbti && (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                    <div className="w-1 h-5 bg-amber-600 rounded-full mr-3"></div>
                    MBTI
                  </h4>
                  <div className="inline-block px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    {selectedMember.mbti}
                  </div>
                </div>
              )}

              {(selectedMember.profile_link || selectedMember.shared_link) && (
                <div className="pt-6 border-t border-slate-200">
                  <h4 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                    <div className="w-1 h-5 bg-amber-600 rounded-full mr-3"></div>
                    Links
                  </h4>
                  <div className="space-y-2">
                    {selectedMember.profile_link && (
                      <a
                        href={selectedMember.profile_link.startsWith('http') ? selectedMember.profile_link : `https://${selectedMember.profile_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center space-x-2 transition-colors group ${
                          selectedMember.profile_link.includes('linkedin') 
                            ? 'text-[#0A66C2] hover:text-[#004182]' 
                            : 'text-amber-700 hover:text-amber-800'
                        }`}
                      >
                        {selectedMember.profile_link.includes('linkedin') ? (
                          <Linkedin className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        ) : (
                          <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        )}
                        <span className="underline">
                          {selectedMember.profile_link.includes('linkedin') ? 'LinkedIn' : '프로필 보기'}
                        </span>
                      </a>
                    )}
                    {selectedMember.shared_link && selectedMember.shared_link !== selectedMember.profile_link && (
                      <a
                        href={selectedMember.shared_link.startsWith('http') ? selectedMember.shared_link : `https://${selectedMember.shared_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center space-x-2 transition-colors group ${
                          selectedMember.shared_link.includes('instagram') 
                            ? 'text-[#E4405F] hover:text-[#C13584]' 
                            : 'text-amber-700 hover:text-amber-800'
                        }`}
                      >
                        {selectedMember.shared_link.includes('instagram') ? (
                          <Instagram className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        ) : (
                          <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        )}
                        <span className="underline">
                          {selectedMember.shared_link.includes('instagram') ? 'Instagram' : '추가 링크'}
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QLWebsite;