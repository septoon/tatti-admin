import React, { useState, FC } from 'react';
import axios from 'axios';
import { Dialog } from 'primereact/dialog';
import Loader from './Loader/Loader';

interface ImageDialogProps {
  dialogVisible: boolean;
  setDialogVisible: (visible: boolean) => void;
  onUpload: (url: string) => void;
}

const ImageDialog: FC<ImageDialogProps> = ({ dialogVisible, setDialogVisible, onUpload }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false); // Состояние для индикации загрузки

  // Обработчик выбора файла и автоматической загрузки
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setIsLoading(true); // Включаем индикатор загрузки
      uploadImage(file);
    }
  };

  // Функция загрузки изображения на ImgBB
  const uploadImage = (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const apiKey = process.env.REACT_APP_IMGBB_KEY;
    const imgbbUrl = `https://api.imgbb.com/1/upload?key=${apiKey}`;

    // Отправка POST-запроса на ImgBB
    axios
      .post(imgbbUrl, formData)
      .then((response) => {
        const uploadedImageUrl = response.data.data.url; // Получение ссылки на загруженное изображение
        onUpload(uploadedImageUrl); // Передаем URL в родительский компонент
        setDialogVisible(false); // Закрываем диалог после успешной загрузки
      })
      .catch((error) => {
        console.error('Ошибка загрузки изображения:', error);
        alert('Ошибка загрузки изображения');
      })
      .finally(() => {
        setIsLoading(false); // Отключаем индикатор загрузки
      });
  };

  return (
    <Dialog
      header=""
      visible={dialogVisible}
      contentClassName="pt-3"
      position="bottom"
      className="w-full flex flex-col"
      onHide={() => setDialogVisible(false)}
      draggable={false}
      resizable={false}>
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-full">
          <Loader imageLoader="true" />
        </div>
      ) : (
        <div className="flex flex-col items-center h-60 bg-white dark:bg-darkCard">
          <label htmlFor="file" className="cursor-pointer">
            <span className="rounded-md w-40 py-3 px-2 text-white bg-orange-600">Выбрать фото</span>
          </label>
          <input id="file" type="file" onChange={handleChange} className="hidden" />
        </div>
      )}
    </Dialog>
  );
};

export default ImageDialog;
