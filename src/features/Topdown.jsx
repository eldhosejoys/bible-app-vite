import { useState, useEffect } from "react";

function Topdown() {
    const [isFloatingButtonVisible1, setIsFloatingButtonVisible1] = useState(false);
    const [isFloatingButtonVisible2, setIsFloatingButtonVisible2] = useState(false);


    const handleButtonTopClick = () => {
      // Handle button click event here
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    };

    const handleButtonDownClick = () => {
      // Handle button click event here
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    };

    useEffect(() => {
        function handleScroll() {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollHeight = document.documentElement.scrollHeight;
          const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
          console.log(scrollHeight)
          if (scrollTop > 3 * viewportHeight && scrollHeight > 5000) {
            setIsFloatingButtonVisible1(true);
          } else {
            setIsFloatingButtonVisible1(false);
          }
          if (scrollTop < scrollHeight - 3 * viewportHeight && scrollHeight > 5000) {
            setIsFloatingButtonVisible2(true);
          } else{
            setIsFloatingButtonVisible2(false);
          }
        }
    
        handleScroll();
        window.addEventListener('scroll', handleScroll);
    
        return () => {
          window.removeEventListener('scroll', handleScroll);
        };
      }, []);

  return (
    <>
    <div className="btn-group floating-button opacity-75" role="group">
       {isFloatingButtonVisible1 && (<button className={`btn btn-sm border-2 ${ isFloatingButtonVisible2 ? 'rounded-end rounded-pill' : 'rounded-pill'} ${localStorage.getItem('theme') == 'dark' ? 'btn-light' : 'btn-dark'}`} onClick={handleButtonTopClick}>  ↑  </button>)} 
       {isFloatingButtonVisible2 && ( <button className={`btn btn-sm btn-secondary ${ isFloatingButtonVisible1 ? 'rounded-start rounded-pill' : 'rounded-pill'}`} onClick={handleButtonDownClick}> <div> ↓ </div>   </button>)}
    </div>
    </>
);
}

export default Topdown;
