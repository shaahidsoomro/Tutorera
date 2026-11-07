"use client";
import { useEffect, useId, useState } from "react";
import api from "@/lib/axios";

export type SchoolOffering = { _id: string; boardCode: string; boardName: string; qualificationCode: string; qualificationName: string; classLevel?: string; subject: string; subjectDisplay: string; approvalLevel: string; aliases?: string[] };
export default function SchoolOfferingSelector({ onSelect }: { onSelect: (offering: SchoolOffering | null) => void }) {
  const [items, setItems] = useState<SchoolOffering[]>([]);
  const [error, setError] = useState(false);
  const [board, setBoard] = useState(""); const [qualification, setQualification] = useState(""); const [level, setLevel] = useState(""); const [id, setId] = useState("");
  const prefix = useId();
  useEffect(() => { let live = true; api.get("/geo/school-offerings").then(({data}) => { if (live) setItems(data.offerings || []); }).catch(() => { if (live) setError(true); }); return () => { live = false; }; }, []);
  const boards = [...new Map(items.map(x => [x.boardCode, x.boardName])).entries()];
  const qualifications = [...new Map(items.filter(x => x.boardCode === board).map(x => [x.qualificationCode, x.qualificationName])).entries()];
  const relevant = items.filter(x => x.boardCode === board && x.qualificationCode === qualification);
  const levels = [...new Set(relevant.map(x => x.classLevel).filter(Boolean))] as string[];
  const subjects = relevant.filter(x => !levels.length || x.classLevel === level);
  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700 disabled:bg-slate-100";
  return <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4"><legend className="px-1 font-semibold text-[#021550]">School programme</legend>
    <p className="text-sm text-slate-600">Choose a board, qualification and subject. A listed subject does not guarantee tutor availability.</p>
    {error ? <p role="alert" className="text-red-700">School subjects could not be loaded. Try again later or use the general subject fields.</p> : !items.length ? <p role="status">No school offerings are currently available.</p> : <>
    <div><label htmlFor={`${prefix}-board`}>Board</label><select id={`${prefix}-board`} className={cls} value={board} onChange={e => {setBoard(e.target.value); setQualification(""); setLevel(""); setId(""); onSelect(null);}}><option value="">Choose board</option>{boards.map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></div>
    <div><label htmlFor={`${prefix}-qualification`}>Qualification</label><select id={`${prefix}-qualification`} className={cls} disabled={!board} value={qualification} onChange={e => {setQualification(e.target.value);setLevel("");setId("");onSelect(null);}}><option value="">Choose qualification</option>{qualifications.map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></div>
    {levels.length > 0 && <div><label htmlFor={`${prefix}-class`}>Class</label><select id={`${prefix}-class`} className={cls} value={level} onChange={e => {setLevel(e.target.value);setId("");onSelect(null);}}><option value="">Choose class</option>{levels.map(v => <option key={v} value={v}>{v}</option>)}</select></div>}
    <div><label htmlFor={`${prefix}-subject`}>Subject</label><select id={`${prefix}-subject`} className={cls} disabled={!qualification || (levels.length > 0 && !level)} value={id} onChange={e => {setId(e.target.value);onSelect(items.find(x => x._id === e.target.value) || null);}}><option value="">Choose subject</option>{subjects.map(x => <option key={x._id} value={x._id}>{x.subjectDisplay}{x.aliases?.length ? ` (${x.aliases.join(", ")})` : ""}</option>)}</select></div>
    </>}</fieldset>;
}
