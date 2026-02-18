import React from 'react'
import { BottomSheet } from 'react-spring-bottom-sheet'
import { IoAttachOutline } from 'react-icons/io5'
import { iosUi } from '../styles/ios'

export type SimpleItemDraft = {
  name: string
  price: string
  description: string
  imageUrl: string
}

type Props = {
  open: boolean
  onDismiss: () => void
  title: string
  formRef: React.RefObject<HTMLFormElement>
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  draft: SimpleItemDraft
  onNameChange: (value: string) => void
  onPriceChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onImageUrlChange: (value: string) => void
  onPickImage: () => void
  imageFile: File | null
  imagePreviewUrl: string
  fileInputRef: React.RefObject<HTMLInputElement>
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  submitting?: boolean
}

export default function SimpleAddItemSheet({
  open,
  onDismiss,
  title,
  formRef,
  onSubmit,
  draft,
  onNameChange,
  onPriceChange,
  onDescriptionChange,
  onImageUrlChange,
  onPickImage,
  imageFile,
  imagePreviewUrl,
  fileInputRef,
  onImageChange,
  submitting = false,
}: Props) {
  const iosLabel = iosUi.label
  const iosInput = `${iosUi.input} text-[16px] focus:ring-[#0a84ff]/35`
  const iosAttachButton = `${iosUi.subtleButton} w-full px-3.5 py-2.5 text-[15px] text-[#0a84ff]`

  return (
    <BottomSheet
      open={open}
      onDismiss={onDismiss}
      className="ios-add-item-sheet"
      header={false}
      expandOnContentDrag
      snapPoints={({ maxHeight }) => Math.min(maxHeight * 0.78, 860)}
      defaultSnap={({ maxHeight }) => Math.min(maxHeight * 0.78, 860)}
    >
      <form
        ref={formRef}
        className="space-y-4 pb-2"
        style={{ fontFamily: iosUi.fontFamily }}
        onSubmit={onSubmit}
      >
        <div className="w-full flex justify-center">
          <div className="w-14 h-2 rounded-lg opacity-50 bg-[#6b7280] dark:bg-[#8e8e93] mt-3" />
        </div>
        <h3 className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">{title}</h3>

        <div className="space-y-1">
          <div className={iosLabel}>Название</div>
          <input
            className={iosInput}
            value={draft.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Введите название"
            required
          />
        </div>

        <div className="space-y-1">
          <div className={iosLabel}>Цена</div>
          <input
            type="number"
            min="0"
            step="1"
            className={iosInput}
            value={draft.price}
            onChange={(e) => onPriceChange(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <div className={iosLabel}>Картинка (URL)</div>
          <input
            className={iosInput}
            value={draft.imageUrl}
            onChange={(e) => onImageUrlChange(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-1">
          <div className={iosLabel}>Картинка (файл)</div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={onPickImage}
              className={iosAttachButton}
              disabled={submitting}
            >
              <span className="flex items-center justify-center gap-2">
                <IoAttachOutline className="text-lg" />
                <span>Добавить изображение</span>
              </span>
            </button>
            {imageFile && (
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#2c2c2e]/70 px-3 py-2 text-[13px] leading-5 text-[#6b7280] dark:text-[#8e8e93] truncate">
                {imageFile.name}
              </div>
            )}
          </div>
          {imagePreviewUrl && (
            <div className="pt-1">
              <img
                src={imagePreviewUrl}
                alt="preview"
                className="h-20 w-20 object-cover rounded-2xl border border-black/10 dark:border-white/10"
              />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImageChange}
          />
        </div>

        <div className="space-y-1">
          <div className={iosLabel}>Описание (по строкам)</div>
          <textarea
            className={`${iosInput} h-24`}
            value={draft.description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>

        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </BottomSheet>
  )
}
