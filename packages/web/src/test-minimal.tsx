import { useState } from 'react';

export function TestComponent(): JSX.Element {
  const [items] = useState<string[]>(['a', 'b']);

  return (
    <div>
      {items.length === 0 ? (
        <div>Empty</div>
      ) : (
        items.map(function (item) {
          return <div key={item}>{item}</div>;
        })
      )}
    </div>
  );
}
