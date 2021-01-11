# Hoitsubotti
Hoitsubotti tarjoilee koronatilastoja telegramiin. Botin handler on @Hoitsubot, tai osoitteesta [https://t.me/Hoitsubot](https://t.me/Hoitsubot)

## Komennot

Hoitsu ymmärtää toistaseksi seuraavia komentoja (muistathan laittaa kenoviivan "/" kutsun eteen (esim /stats).

+ **stats** - Suomen koronatilastot
+ **doublingtime** - Tilasto tartuntojen tuplaantumisajan muutoksista (kirjoita komennon perään sairaanhoitopiirin nimi saadaksesi vain sen alueen tuplaantumisajan, esim */doublingtime HUS*)
+ **charts** - Kaavio päiväkohtaisista tartunnoista 30 päivän ajalta
+ **hospitals** - Kaavio sairaalahoidossa olevista potilaista
+ **help** - Tietoja botista
+ **startupdates** - Vastaanota automaattisia viestejä uusista tartunnoista
+ **stopupdates** - Lopeta automaattisten viestien vastaanotto
+ **vaccination** - Rokotusten status

## Tietoja

Botti toimii AWS:n Lambdan päällä ja tarvitsee toimiakseen yhteyden tietokantaan sekä Telegramin palvelimille asetetun webhookin.

## Data

Tällä hetkellä data haetaan THL:n avoimesta datasta. Se ei toistaiseksi tarjoa tietoa kuolleiden tai parantuneiden määrästä.
