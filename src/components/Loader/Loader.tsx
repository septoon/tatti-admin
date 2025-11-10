import React from 'react';
import './Loader.css';
import './ImageLoader.css';

interface LoaderProps {
  imageLoader?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ imageLoader = false }) => {
  return (
    <div
      className={`w-full h-full page-el ${
        imageLoader ? '' : 'pt-[40%]'
      } flex justify-center items-center`}
    >
      <div className={imageLoader ? 'imageLoader' : 'loader'}></div>
    </div>
  );
};

export default Loader;