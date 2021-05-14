import React, { HTMLAttributes, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import raf from 'raf';

import classnames from 'src/util/classnames';
import useUncontrolled from 'src/useUncontrolled';
import { Override } from 'src/interface';

const scrollMap: { [key: number]: number } = {};

const _scrollTo = (element: Element, to: number, duration: number, uid: number, tag: number) => {
    if (tag != scrollMap[uid]) return;
    if (duration <= 0) {
        raf(() => {
            element.scrollTop = to;
        });
        return;
    }
    const difference = to - element.scrollTop;
    const perTick = (difference / duration) * 10;

    raf(() => {
        element.scrollTop += perTick;
        if (element.scrollTop === to) return;
        _scrollTo(element, to, duration - 10, uid, tag);
    });
};

const scrollTo = (element: Element, to: number, duration: number, uid: number) => {
    _scrollTo(element, to, duration, uid, (scrollMap[uid] = (scrollMap[uid] | 0) + 1));
};

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

let _uid = 0;

interface ScrollerInterface {
    value?: number;
    steps: (number | string)[];
    onChange?: (v: number) => void;
    prefixCls: string;
}
const ScrollerWithoutMemo = ({ value = 0, steps, onChange, prefixCls }: ScrollerInterface) => {
    const [scrollLock, setScrollLock] = useState(true);
    const scroller = useRef<HTMLDivElement>(null);
    const uid = useMemo(() => _uid++, []);

    // save value into ref
    const valueRef = useRef(0);

    // update value from scrollerDOM scrollTop and trigger onChange
    const updateValue = useCallback(() => {
        const scrollerDOM = scroller.current;
        if (!scrollerDOM) return;
        const firstChild = scrollerDOM.childNodes[0] as HTMLDivElement;
        const rect = firstChild.getClientRects()?.[0];
        if (!rect) return;
        const childHeight = rect.height;
        const scrollTop = scrollerDOM.scrollTop;
        const currentIndex = Math.round(scrollTop / childHeight);
        onChange?.(currentIndex);
    }, [onChange]);

    // update scrollerDom scroll bar to value
    const updateScroll = useCallback(
        (v: number, duration = 100) => {
            const scrollerDOM = scroller.current;
            if (!scrollerDOM) return;
            const firstChild = scrollerDOM.childNodes[0] as HTMLDivElement;
            const rect = firstChild.getClientRects()?.[0];
            if (!rect) return;
            const childHeight = rect.height;

            scrollTo(scrollerDOM, childHeight * v, duration, uid);
        },
        [uid]
    );

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
            updateScroll(valueRef.current, 0);
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
        if (valueRef.current === value) return;
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

    const cls = useMemo(
        () => ({
            wrap: `${prefixCls}-wrap`,
            scroller: `${prefixCls}-scroller`,
            stepper: `${prefixCls}-stepper`,
            active: `${prefixCls}-active`
        }),
        [prefixCls]
    );

    return (
        <div className={cls.wrap}>
            <div ref={scroller} className={cls.scroller}>
                {steps.map((v, i) => {
                    return (
                        <Stepper
                            key={v}
                            index={i}
                            onStepperClick={onStepperClick}
                            className={classnames(cls.stepper, value === i && cls.active)}
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
    defaultValue,
    onChange: _onChange,
    mode = ['HH', 'mm', 'ss'],
    prefixCls = 'zr-timer',
    className,
    ...rest
}: Override<
    HTMLAttributes<HTMLDivElement>,
    {
        // controlled value
        value?: Date;
        // uncontrolled default value
        defaultValue?: Date;
        // callback when user change
        onChange?: (d: Date) => void;
        // change display of timer
        mode?: ('HH' | 'H' | 'mm' | 'm' | 'ss' | 's')[];
        // custom prefix className
        prefixCls?: string;
    }
>) => {
    const d = useMemo(() => new Date(), []);
    const [value, onChange] = useUncontrolled(_value, defaultValue, _onChange);
    const stepsArray = useMemo(() => mode.map(v => StepsMap[v]), [mode]);
    const valueArray = useMemo(() => {
        let valueMap: { hour: number; minute: number; second: number };
        if (value == null) {
            valueMap = { hour: 0, minute: 0, second: 0 };
        } else {
            const date = new Date(value);
            const hour = date.getHours(),
                minute = date.getMinutes(),
                second = date.getSeconds();
            valueMap = { hour, minute, second };
        }
        return mode.map(v => valueMap[TypeMap[v]]);
    }, [value, mode]);

    // use ref to reduce reRender
    const valueRef = useRef(value);
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    const onHourChange = useCallback(
        (hour: number) => {
            const date = new Date(valueRef.current == null ? d : valueRef.current);
            onChange(new Date(date.setHours(hour)));
        },
        [d, onChange]
    );
    const onMinuteChange = useCallback(
        (minute: number) => {
            const date = new Date(valueRef.current == null ? d : valueRef.current);
            onChange(new Date(date.setMinutes(minute)));
        },
        [d, onChange]
    );
    const onSecondChange = useCallback(
        (second: number) => {
            const date = new Date(valueRef.current == null ? d : valueRef.current);
            onChange(new Date(date.setSeconds(second)));
        },
        [d, onChange]
    );

    const callbackMap = { hour: onHourChange, minute: onMinuteChange, second: onSecondChange };

    return (
        <div className={classnames(prefixCls, className)} {...rest}>
            {mode.map((mode, i) => {
                const steps = stepsArray[i];
                const value = valueArray[i];
                return (
                    <Scroller
                        key={i}
                        value={value}
                        onChange={callbackMap[TypeMap[mode]]}
                        steps={steps}
                        prefixCls={prefixCls}
                    />
                );
            })}
        </div>
    );
};

export default memo(Timer);
