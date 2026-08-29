import { useState } from 'react';

export function Test(): JSX.Element {
  const [items] = useState<string[]>(['a', 'b']);

  return (
    <div>
      {items.map(function (item) {
        return <div key={item}>{item}</div>;
      })}
    </div>
  );
}
