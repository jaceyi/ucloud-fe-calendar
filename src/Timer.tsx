import React, { HTMLAttributes, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import classnames from './util/classnames';
import useUncontrolled from './useUncontrolled';

interface ScrollerInterface {
    value?: number;
    steps: (number | string)[];
    onChange?: (v: number) => void;
}

const StepperWithoutMemo = ({
    index,
    onStepperClick,
    ...rest
}: { index: number; onStepperClick: (i: number) => void } & HTMLAttributes<HTMLDivElement>) => {
    const onClick = useCallback(() => {
        onStepperClick(index);
    }, [index, onStepperClick]);
    return <div onClick={onClick} {...rest} />;
};
const Stepper = memo(StepperWithoutMemo);

const ScrollerWithoutMemo = ({ value = 0, steps, onChange }: ScrollerInterface) => {
    const [scrollLock, setScrollLock] = useState(true);
    const scroller = useRef<HTMLDivElement>(null);

    // save value into ref
    const valueRef = useRef(value);

    // update value from scrollerDOM scrollTop and trigger onChange
    const updateValue = useCallback(() => {
        const scrollerDOM = scroller.current;
        if (!scrollerDOM) return;
        const firstChild = scrollerDOM.childNodes[0] as HTMLDivElement;
        const childHeight = firstChild.getClientRects()[0].height;
        const scrollTop = scrollerDOM.scrollTop;
        const currentIndex = Math.round(scrollTop / childHeight);
        onChange?.(currentIndex);
    }, [onChange]);

    // update scrollerDom scroll bar to value
    const updateScroll = useCallback((v: number) => {
        const scrollerDOM = scroller.current;
        if (!scrollerDOM) return;
        const firstChild = scrollerDOM.childNodes[0] as HTMLDivElement;
        const childHeight = firstChild.getClientRects()[0].height;

        scrollerDOM.scrollTop = childHeight * v;
    }, []);

    useEffect(() => {
        const scrollerDOM = scroller.current;
        if (!scrollerDOM) return;

        const onScroll = (e: Event) => {
            if (scrollLock) {
                e.preventDefault();
                return false;
            }
            updateValue();
        };
        const onMouseEnter = () => {
            // unlock scroll
            setScrollLock(false);
        };
        const onMouseLeave = () => {
            // lock scroll
            setScrollLock(true);
            // use valueRef value to avoid bind/unbind frequently
            updateScroll(valueRef.current);
        };

        scrollerDOM.addEventListener(`scroll`, onScroll);
        scrollerDOM.addEventListener('mouseenter', onMouseEnter);
        scrollerDOM.addEventListener('mouseleave', onMouseLeave);
        return () => {
            scrollerDOM.removeEventListener(`scroll`, onScroll);
            scrollerDOM.removeEventListener('mouseenter', onMouseEnter);
            scrollerDOM.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [updateScroll, updateValue, scrollLock]);

    useEffect(() => {
        // update value ref
        valueRef.current = value;
        if (!scrollLock) return;
        // update scroll when scroll lock and value change
        updateScroll(value);
    }, [updateScroll, value, scrollLock]);

    const onStepperClick = useCallback(
        (index: number) => {
            // scroll to clicked step
            updateScroll(index);
        },
        [updateScroll]
    );

    return (
        <div className="zr-timer-container">
            <div ref={scroller}>
                {steps.map((v, i) => {
                    return (
                        <Stepper
                            key={v}
                            index={i}
                            onStepperClick={onStepperClick}
                            className={classnames(value === i ? 'active' : '')}
                        >
                            {v}
                        </Stepper>
                    );
                })}
            </div>
        </div>
    );
};

const Scroller = memo(ScrollerWithoutMemo);

type FormatString = 'HH' | 'H' | 'mm' | 'm' | 'ss' | 's';
type TypeString = 'hour' | 'minute' | 'second';

const padZero = (v: string | number) => {
    const s = `00${v}`;
    return s.substr(s.length - 2);
};

const H = new Array(24).fill(null).map((v, i) => i);
const HH = H.map(padZero);
const m = new Array(60).fill(null).map((v, i) => i);
const mm = m.map(padZero);
const s = new Array(60).fill(null).map((v, i) => i);
const ss = s.map(padZero);
const StepsMap: Record<FormatString, (string | number)[]> = {
    H,
    HH,
    m,
    mm,
    s,
    ss
};

const TypeMap: Record<FormatString, TypeString> = {
    H: 'hour',
    HH: 'hour',
    m: 'minute',
    mm: 'minute',
    s: 'second',
    ss: 'second'
};

const Timer = ({
    value: _value,
    defaultValue = new Date(),
    onChange: _onChange,
    mode = ['HH', 'mm', 'ss']
}: {
    value?: Date;
    defaultValue?: Date;
    onChange?: (d: Date) => void;
    mode?: ('HH' | 'H' | 'mm' | 'm' | 'ss' | 's')[];
}) => {
    const [value, onChange] = useUncontrolled(_value, defaultValue, _onChange);
    const stepsArray = useMemo(() => mode.map(v => StepsMap[v]), [mode]);
    const valueArray = useMemo(() => {
        const date = new Date(value);
        const hour = date.getHours(),
            minute = date.getMinutes(),
            second = date.getSeconds();
        const valueMap = { hour, minute, second };
        return mode.map(v => valueMap[TypeMap[v]]);
    }, [value, mode]);

    const onHourChange = useCallback(
        (hour: number) => {
            const date = new Date(value);
            onChange(new Date(date.setHours(hour)));
        },
        [onChange, value]
    );
    const onMinuteChange = useCallback(
        (hour: number) => {
            const date = new Date(value);
            onChange(new Date(date.setMinutes(hour)));
        },
        [onChange, value]
    );
    const onSecondChange = useCallback(
        (hour: number) => {
            const date = new Date(value);
            onChange(new Date(date.setSeconds(hour)));
        },
        [onChange, value]
    );

    const callbackMap = { hour: onHourChange, minute: onMinuteChange, second: onSecondChange };

    return (
        <div className="zr-timer-timer">
            {mode.map((mode, i) => {
                const steps = stepsArray[i];
                const value = valueArray[i];
                return <Scroller key={i} value={value} onChange={callbackMap[TypeMap[mode]]} steps={steps} />;
            })}
        </div>
    );
};

export default memo(Timer);
