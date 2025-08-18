import React, { useEffect, useState } from 'react';
import './loader.css'
import './ImageLoader.css'

const Loader = ({imageLoader}) => {
  const [animationClass, setAnimationClass] = useState('page-el-enter');

  useEffect(() => {
    setAnimationClass('page-el-enter-active');
  }, []);

  return (
    <div className={`w-full h-full page-el ${animationClass} ${imageLoader ? '' : 'pt-[40%]'} flex justify-center items-center`}>
      <div className={imageLoader ? "imageLoader" : "loader"}></div>
    </div>
  )
}

export default Loader