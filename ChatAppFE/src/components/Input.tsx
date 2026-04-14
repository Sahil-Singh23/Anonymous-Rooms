import { forwardRef } from "react"

type inputProps = {
    placeholder: string,
    width: string,
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void,
    onInput?: (e: React.FormEvent<HTMLInputElement>) => void,
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void,
    value?: string,
    disabled?: boolean,
    inputMode?: "search" | "text" | "email" | "tel" | "url" | "none" | "numeric" | "decimal",
    autoComplete?: string,
    autoCorrect?: string,
    spellCheck?: boolean,
    merged?: boolean
}


const Input = forwardRef<HTMLInputElement, inputProps>((props, ref) => {
  const borderClass = props.merged ? '' : 'border border-solid border-[#444444] rounded-xl';
  const paddingClass = props.merged ? 'pl-2 pr-4' : 'px-4';
  
  return (
    <div className={`${props.width}`}>
      <input 
        ref={ref}
        type="text" 
        className={`flex flex-col shrink-0 items-center text-left py-3 ${paddingClass} ${borderClass} w-full text-white bg-transparent focus:outline-none focus:border-[#beb59b]`}
        placeholder={props.placeholder}
        onKeyDown={props.onKeyDown}
        onInput={props.onInput}
        onChange={props.onChange}
        onBlur={props.onBlur}
        value={props.value}
        disabled={props.disabled}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        autoCorrect={props.autoCorrect}
        spellCheck={props.spellCheck}
      />
    </div>
  )
})

Input.displayName = 'Input'

export default Input
