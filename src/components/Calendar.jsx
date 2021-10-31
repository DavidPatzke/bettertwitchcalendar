import React from 'react';
import { useEffect } from 'react';
import { useRef } from 'react';
import { useState } from 'react';
import './Calendar.css';
import { Badge, Tooltip, OverlayTrigger, Button } from 'react-bootstrap';
import { BsFillCaretLeftFill, BsFillCaretRightFill, BsPlusCircleFill } from "react-icons/bs";
function Event(props) {
    const title = props.title
    const renderTooltip = (props) => (
        <Tooltip  {...props}>
            {title || 'No stream title available'}
        </Tooltip>
    );
    const color = props.color || '#0d6efd';
    console.log(color);
    const time = props.time.replace(/(.*)\D\d+/, '$1');
    return (<OverlayTrigger
        placement="right"
        delay={{ show: 250, hide: 400 }}
        overlay={renderTooltip}
    >
        
        <span data-tooltip={props.title || 'No stream title available'}  className='badge' style={{backgroundColor: color}}><Badge text='dark' bg='light'>{time} </Badge> {props.streamer} </span>
    </OverlayTrigger>)

}


function Calendar(props) {

    const today = new Date();
    const fieldsDefault = ['B', 'C', 'D', 'E', 'F', 'G'].map((e) => {
        const a = []
        for (let j = 1; j <= 7; j++) {
            a.push(e + j)
        }
        return a;

    }).flat(1);


    const calendar = useRef(null);
    const [date, setDate] = useState(props.startDate);
    const [fields, setFields] = useState([]);

    const events = {};

    props.events.forEach((event) => {
        events[event.date.getFullYear()] = events[event.date.getFullYear()] || {};
        events[event.date.getFullYear()][event.date.getMonth()] = events[event.date.getFullYear()][event.date.getMonth()] || {};
        events[event.date.getFullYear()][event.date.getMonth()][event.date.getDate()] = events[event.date.getFullYear()][event.date.getMonth()][event.date.getDate()] || [];
        events[event.date.getFullYear()][event.date.getMonth()][event.date.getDate()].push(event)
        events[event.date.getFullYear()][event.date.getMonth()][event.date.getDate()] = events[event.date.getFullYear()][event.date.getMonth()][event.date.getDate()].sort(function (a, b) {
            return a.time.localeCompare(b.time);
        });

    })
    const ownEvents = {}
    console.log(props);
    props.ownSchedule.forEach((segment) => {
        const date = new Date(segment.start_time);
        const event = {
            title: segment.title,
            date: date,
            time: date.toLocaleTimeString(),
            streamer: 'You',
            streamerId: '',
            color: 'rgba(255,155,1,1)'
          }
        
        ownEvents[date.getFullYear()] = ownEvents[date.getFullYear()] || {};
        ownEvents[date.getFullYear()][date.getMonth()] = ownEvents[date.getFullYear()][date.getMonth()] || {};
        ownEvents[date.getFullYear()][date.getMonth()][date.getDate()] = ownEvents[date.getFullYear()][date.getMonth()][date.getDate()] || [];
        ownEvents[date.getFullYear()][date.getMonth()][date.getDate()].push(event)
        ownEvents[date.getFullYear()][date.getMonth()][date.getDate()] = ownEvents[date.getFullYear()][date.getMonth()][date.getDate()].sort(function (a, b) {
            return a.time.localeCompare(b.time);
        });
    })


    const CalendarDayField = (childprops) => {
        let eventsOfDay = null;
        let ownEventsOfDay = null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let classes = childprops.position + ' border calendarField ';
        if (childprops.id) {
            const date = new Date(childprops.id)
            eventsOfDay = events?.[date.getFullYear()]?.[date.getMonth()]?.[date.getDate()]
            ownEventsOfDay = ownEvents?.[date.getFullYear()]?.[date.getMonth()]?.[date.getDate()]
            if (today.toDateString() === date.toDateString()) {
                classes = `${classes} today`
            }
        }


        return <div key={childprops.id} className={classes} ><div>{childprops.text} </div>
            {eventsOfDay && eventsOfDay.map(event => {
                return <Event
                    color={event.color}
                    time={event.time}
                    title={event.title}
                    streamer={event.streamer}></Event>

            }
            )}
             {ownEventsOfDay && ownEventsOfDay.map(event => {
                return <Event
                    color={event.color}
                    time={event.time}
                    title={event.title}
                    streamer={event.streamer}></Event>

            }
            )}
        </div>
    }



    const addEventLocally = () => {

    }

    useEffect(() => {

        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

        let fieldsCopy = fieldsDefault.slice();
        let tempFields = [];

        [...Array(42).keys()].forEach((index) => {


            const dayOfMonth = index + 1
            const calDate = new Date(date.getFullYear(), date.getMonth(), dayOfMonth);

            const weekDay = calDate.getDay();

            fieldsCopy.some((field, arrayPos) => {
                const calendarDayFieldObj = { position: field };

                if (index < daysInMonth && (weekDay + '' === field[1] || (weekDay === 0 && field[1] == 7))) {

                    const id = calDate.toDateString();

                    calendarDayFieldObj.id = id
                    calendarDayFieldObj.text = index + 1;

                    tempFields.push(calendarDayFieldObj);
                    fieldsCopy = fieldsCopy.slice(arrayPos + 1)

                    return true;

                } else if (index < daysInMonth) {

                    tempFields.push(calendarDayFieldObj);
                }
            })



        })
        const arrLe = 42 - tempFields.length;
        const fillArray = [...Array(arrLe).fill({})]
        tempFields = [...tempFields, ...fillArray]
        setFields(tempFields);

    }, [date]);

    const addMonth = (ammount) => {
        const month = date.getMonth() + ammount + 1;


        const nextDate = new Date(date.getFullYear(), month, 0);


        console.log(ammount)
        setDate(nextDate)
    }

    return <>
        <div className='calendarMonthPicker'> <Button onClick={() => { addMonth(-1) }} variant="link"><BsFillCaretLeftFill /></Button>
            <h1 style={{ width: '350px', textAlign: 'center', backgroundColor: 'white' }}>{date.toLocaleString('default', { month: 'long' }) + ' ' + date.getFullYear()}</h1>
            <Button onClick={() => { addMonth(1) }} variant="link"><BsFillCaretRightFill /></Button> </div>


        <div ref={calendar} className='calendar-container'>


            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => <div className={'A' + (index + 1) + ' calendarField calendarHeader'} >{day}.</div>)}
            {fields.map((e) => {

                return <CalendarDayField key={e.posiiton} text={e.text} id={e.id} position={e.position} />
            })}


        </div>
    </>
}

export default Calendar;